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
        
        # Determine collection name
        env = os.getenv("NODE_ENV", os.getenv("APP_ENV", "development"))
        is_production = env in ["production", "prod"]
        self.collection_name = "product-images-pro" if is_production else "product-images-dev"
        
        print(f"📦 Using Qdrant collection: {self.collection_name} (environment: {env})")
        
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
        must_conditions = []
        if filters.get("merchantId"):
            must_conditions.append(
                FieldCondition(
                    key="merchantId",
                    match=MatchValue(value=str(filters["merchantId"]))
                )
            )
        if filters.get("outletId"):
            must_conditions.append(
                FieldCondition(
                    key="outletId",
                    match=MatchValue(value=str(filters["outletId"]))
                )
            )
        if filters.get("categoryId"):
            must_conditions.append(
                FieldCondition(
                    key="categoryId",
                    match=MatchValue(value=str(filters["categoryId"]))
                )
            )
        
        qdrant_filter = Filter(must=must_conditions) if must_conditions else None
        
        # Vector search in Qdrant
        search_limit = max(limit * 2, 30)  # Get more results to filter
        
        search_results = self.qdrant_client.search(
            collection_name=self.collection_name,
            query_vector=embedding,
            limit=search_limit,
            score_threshold=min_similarity,
            query_filter=qdrant_filter,
            with_payload=True
        )
        
        search_duration = int((time.time() - search_start) * 1000)
        print(f"📊 Qdrant search: {len(search_results)} results in {search_duration}ms")
        
        if not search_results:
            return {
                "products": [],
                "total": 0,
                "searchDuration": search_duration,
                "fetchDuration": 0
            }
        
        # Extract product IDs
        product_ids = []
        similarity_map = {}
        for result in search_results[:limit]:  # Take top N
            product_id = result.payload.get("productId") or result.payload.get("product_id")
            if product_id:
                try:
                    product_ids.append(int(product_id))
                    similarity_map[int(product_id)] = result.score
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
        
        if self.db_pool:
            try:
                async with self.db_pool.acquire() as conn:
                    # Build query with IN clause
                    placeholders = ','.join([f'${i+1}' for i in range(len(product_ids))])
                    # Query using publicId (external ID) for products
                    # Note: product_ids are publicIds from Qdrant payload
                    query = """
                        SELECT 
                            p."publicId" as id,
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
                            c."publicId" as "categoryId",
                            c.name as "categoryName",
                            m."publicId" as "merchantId",
                            m.name as "merchantName"
                        FROM "Product" p
                        LEFT JOIN "Category" c ON p."categoryId" = c.id
                        LEFT JOIN "Merchant" m ON p."merchantId" = m.id
                        WHERE p."publicId" = ANY($1::int[])
                        ORDER BY array_position($1::int[], p."publicId")
                    """
                    
                    rows = await conn.fetch(query, product_ids)
                    
                    for row in rows:
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
                # Return product IDs with similarity if fetch fails
                products = [
                    {
                        "id": pid,
                        "similarity": similarity_map.get(pid, 0.0),
                        "similarityPercent": int(similarity_map.get(pid, 0.0) * 100)
                    }
                    for pid in product_ids
                ]
        else:
            # No database connection, return IDs only
            products = [
                {
                    "id": pid,
                    "similarity": similarity_map.get(pid, 0.0),
                    "similarityPercent": int(similarity_map.get(pid, 0.0) * 100)
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
