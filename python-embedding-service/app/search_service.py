"""
Search service for image search
Handles: embedding generation + vector search + product fetching
"""

import os
from typing import List, Dict, Optional, Any
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
import asyncpg
import json
import time

class SearchService:
    """Service for image search with embedding + vector search + product fetch"""
    
    def __init__(self):
        self.qdrant_client = None
        self.db_pool = None
        self.collection_name = None
        
    async def initialize(self):
        """Initialize Qdrant and PostgreSQL connections"""
        # Initialize Qdrant
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        self.qdrant_client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key if qdrant_api_key else None
        )
        
        # Determine collection name (use QDRANT_COLLECTION_ENV if set, fallback to NODE_ENV/APP_ENV)
        # This avoids Next.js automatically setting NODE_ENV=production issue
        collection_env = os.getenv("QDRANT_COLLECTION_ENV") or os.getenv("APP_ENV") or os.getenv("NODE_ENV", "development")
        is_production = collection_env in ["production", "prod"]
        self.collection_name = "product-images-pro" if is_production else "product-images-dev"
        
        print(f"📦 Using Qdrant collection: {self.collection_name}", {
            "QDRANT_COLLECTION_ENV": os.getenv("QDRANT_COLLECTION_ENV") or "not set",
            "APP_ENV": os.getenv("APP_ENV") or "not set",
            "NODE_ENV": os.getenv("NODE_ENV") or "not set",
            "usedEnv": collection_env,
            "isProduction": is_production
        })
        
        # Initialize PostgreSQL connection pool
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            # Parse DATABASE_URL and create connection pool
            self.db_pool = await asyncpg.create_pool(
                database_url,
                min_size=1,
                max_size=5
            )
            print("✅ PostgreSQL connection pool created")
        else:
            print("⚠️ DATABASE_URL not set, product fetching will be disabled")
    
    async def search_products(
        self,
        embedding: List[float],
        filters: Dict[str, Any],
        limit: int = 20,
        min_similarity: float = 0.5
    ) -> Dict[str, Any]:
        """
        Complete image search: vector search + product fetching
        
        Args:
            embedding: Query embedding vector (512 dimensions)
            filters: Search filters (merchantId, outletId, categoryId)
            limit: Maximum number of results
            min_similarity: Minimum similarity threshold
            
        Returns:
            {
                "products": [...],
                "total": int,
                "searchDuration": int,
                "fetchDuration": int
            }
        """
        search_start = time.time()
        
        # Build Qdrant filter
        # NOTE: Products belong to MERCHANT, not specific outlets
        # So we only filter by merchantId, not outletId
        must_conditions = []
        if filters.get("merchantId"):
            must_conditions.append(
                FieldCondition(
                    key="merchantId",
                    match=MatchValue(value=str(filters["merchantId"]))
                )
            )
        # Don't filter by outletId - products belong to merchant, not outlet
        # Outlet-level access control is handled by merchantId filter
        
        if filters.get("categoryId"):
            must_conditions.append(
                FieldCondition(
                    key="categoryId",
                    match=MatchValue(value=str(filters["categoryId"]))
                )
            )
        
        qdrant_filter = Filter(must=must_conditions) if must_conditions else None
        
        # Debug: Log search parameters
        print(f"🔍 Qdrant search parameters:")
        print(f"   - Collection: {self.collection_name}")
        print(f"   - Filters: {filters}")
        print(f"   - Min similarity: {min_similarity}")
        print(f"   - Limit: {limit}")
        print(f"   - Must conditions: {len(must_conditions)}")
        
        # Vector search in Qdrant
        # OPTIMIZATION: Single search with threshold (removed duplicate debug query)
        # OPTIMIZATION: Reduced multiplier from 2x to 1.5x for better performance (still enough for filtering)
        search_limit = max(int(limit * 1.5), 20)  # Reduced from limit * 2 to limit * 1.5
        
        search_results = self.qdrant_client.search(
            collection_name=self.collection_name,
            query_vector=embedding,
            limit=search_limit,
            score_threshold=min_similarity,
            query_filter=qdrant_filter,
            with_payload=True
        )
        
        # Debug: Log top results for monitoring (without extra query)
        if search_results:
            print(f"🔍 Top results (above threshold {min_similarity}):")
            for i, result in enumerate(search_results[:5], 1):
                print(f"   {i}. Product {result.payload.get('productId')}: {result.score:.4f}")
        
        search_duration = int((time.time() - search_start) * 1000)
        print(f"📊 Qdrant search: {len(search_results)} results (above threshold {min_similarity}) in {search_duration}ms")
        
        if not search_results:
            return {
                "products": [],
                "total": 0,
                "searchDuration": search_duration,
                "fetchDuration": 0
            }
        
        # Extract product IDs and metadata from Qdrant payload
        product_ids = []
        similarity_map = {}
        metadata_map = {}  # Store metadata (merchantId, outletId, etc.) from Qdrant
        
        for result in search_results[:limit]:  # Take top N
            product_id = result.payload.get("productId") or result.payload.get("product_id")
            if product_id:
                try:
                    product_id_int = int(product_id)
                    product_ids.append(product_id_int)
                    similarity_map[product_id_int] = result.score
                    
                    # Store metadata from Qdrant payload
                    metadata_map[product_id_int] = {
                        "merchantId": result.payload.get("merchantId"),
                        "outletId": result.payload.get("outletId"),
                        "categoryId": result.payload.get("categoryId"),
                        "productName": result.payload.get("productName"),
                        "imageUrl": result.payload.get("imageUrl")
                    }
                except (ValueError, TypeError):
                    continue
        
        if not product_ids:
            return {
                "products": [],
                "total": 0,
                "searchDuration": search_duration,
                "fetchDuration": 0
            }
        
        # Fetch products from PostgreSQL
        fetch_start = time.time()
        products = []
        
        print(f"🔍 Checking database connection: {'✅ Connected' if self.db_pool else '❌ No connection (DATABASE_URL not set)'}")
        print(f"📊 Product IDs to fetch: {product_ids}")
        
        if self.db_pool:
            try:
                async with self.db_pool.acquire() as conn:
                    # Build query with IN clause
                    placeholders = ','.join([f'${i+1}' for i in range(len(product_ids))])
                    # OPTIMIZED: Query using id (primary key) for products
                    # Note: product_ids are Int IDs from Qdrant payload
                    # OPTIMIZATION: Only select needed fields, use efficient array_position for ordering
                    query = """
                        SELECT 
                            p.id,
                            p.name,
                            p.description,
                            p.barcode,
                            p."rentPrice",
                            p."salePrice",
                            p.deposit,
                            p.images,
                            p."totalStock",
                            p."isActive",
                            p."createdAt",
                            p."updatedAt",
                            c.id as "categoryId",
                            c.name as "categoryName",
                            m.id as "merchantId",
                            m.name as "merchantName"
                        FROM "Product" p
                        LEFT JOIN "Category" c ON p."categoryId" = c.id
                        LEFT JOIN "Merchant" m ON p."merchantId" = m.id
                        WHERE p.id = ANY($1::int[])
                        ORDER BY array_position($1::int[], p.id)
                        LIMIT $2
                    """
                    
                    # OPTIMIZATION: Add limit to prevent fetching too many rows
                    fetch_limit = len(product_ids) + 5  # Small buffer for safety
                    
                    rows = await conn.fetch(query, product_ids, fetch_limit)
                    
                    print(f"📊 Fetched {len(rows)} rows from database for {len(product_ids)} product IDs")
                    
                    if len(rows) == 0:
                        print(f"⚠️ No products found in database for IDs: {product_ids}")
                        # Return product IDs with similarity and metadata from Qdrant if no rows found
                        products = [
                            {
                                "id": pid,
                                "similarity": similarity_map.get(pid, 0.0),
                                "similarityPercent": int(similarity_map.get(pid, 0.0) * 100),
                                "merchantId": metadata_map.get(pid, {}).get("merchantId"),
                                "outletId": metadata_map.get(pid, {}).get("outletId"),
                                "categoryId": metadata_map.get(pid, {}).get("categoryId"),
                                "name": metadata_map.get(pid, {}).get("productName"),
                                "imageUrl": metadata_map.get(pid, {}).get("imageUrl")
                            }
                            for pid in product_ids
                        ]
                    else:
                        for row in rows:
                            # Get metadata from Qdrant if available (fallback to database)
                            metadata = metadata_map.get(row["id"], {})
                            product = {
                                "id": row["id"],
                                "name": row["name"],
                                "description": row["description"],
                                "barcode": row["barcode"],
                                "rentPrice": float(row["rentPrice"]) if row["rentPrice"] else None,
                                "salePrice": float(row["salePrice"]) if row["salePrice"] else None,
                                "deposit": float(row["deposit"]) if row["deposit"] else None,
                                "images": row["images"] if row["images"] else [],
                                "totalStock": row["totalStock"],
                                "isActive": row["isActive"],
                                "createdAt": row["createdAt"].isoformat() if row["createdAt"] else None,
                                "updatedAt": row["updatedAt"].isoformat() if row["updatedAt"] else None,
                                "merchantId": row["merchantId"] or metadata.get("merchantId"),
                                "outletId": metadata.get("outletId"),
                                "categoryId": row["categoryId"] or metadata.get("categoryId"),
                                "category": {
                                    "id": row["categoryId"],
                                    "name": row["categoryName"]
                                } if row["categoryId"] else None,
                                "merchant": {
                                    "id": row["merchantId"],
                                    "name": row["merchantName"]
                                } if row["merchantId"] else None,
                                "similarity": similarity_map.get(row["id"], 0.0),
                                "similarityPercent": int(similarity_map.get(row["id"], 0.0) * 100)
                            }
                            products.append(product)
                    
            except Exception as e:
                print(f"❌ Error fetching products: {e}")
                import traceback
                traceback.print_exc()
                # Return product IDs with similarity and metadata from Qdrant if fetch fails
                products = [
                    {
                        "id": pid,
                        "similarity": similarity_map.get(pid, 0.0),
                        "similarityPercent": int(similarity_map.get(pid, 0.0) * 100),
                        "merchantId": metadata_map.get(pid, {}).get("merchantId"),
                        "outletId": metadata_map.get(pid, {}).get("outletId"),
                        "categoryId": metadata_map.get(pid, {}).get("categoryId"),
                        "name": metadata_map.get(pid, {}).get("productName"),
                        "imageUrl": metadata_map.get(pid, {}).get("imageUrl")
                    }
                    for pid in product_ids
                ]
        else:
            # No database connection, return IDs with metadata from Qdrant
            products = [
                {
                    "id": pid,
                    "similarity": similarity_map.get(pid, 0.0),
                    "similarityPercent": int(similarity_map.get(pid, 0.0) * 100),
                    "merchantId": metadata_map.get(pid, {}).get("merchantId"),
                    "outletId": metadata_map.get(pid, {}).get("outletId"),
                    "categoryId": metadata_map.get(pid, {}).get("categoryId"),
                    "name": metadata_map.get(pid, {}).get("productName"),
                    "imageUrl": metadata_map.get(pid, {}).get("imageUrl")
                }
                for pid in product_ids
            ]
        
        fetch_duration = int((time.time() - fetch_start) * 1000)
        print(f"✅ Fetched {len(products)} products in {fetch_duration}ms")
        
        # Sort by similarity (highest first)
        products.sort(key=lambda p: p.get("similarity", 0), reverse=True)
        
        return {
            "products": products,
            "total": len(products),
            "searchDuration": search_duration,
            "fetchDuration": fetch_duration
        }
    
    async def close(self):
        """Close connections"""
        if self.db_pool:
            await self.db_pool.close()
            print("✅ PostgreSQL connection pool closed")
