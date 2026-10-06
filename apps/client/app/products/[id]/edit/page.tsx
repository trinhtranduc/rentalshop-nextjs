'use client';

/** Sửa sản phẩm (#547): the shared product form on the shell (no update permission → notice). */
import React from 'react';
import { useParams } from 'next/navigation';
import { ProductFormPage } from '../../form/ProductFormPage';

export default function ProductEditPage() {
  const params = useParams();
  const id = Number(params.id);
  // A bad id still goes through the form so it shows "Không tìm thấy sản phẩm"
  return <ProductFormPage key={String(params.id)} productId={Number.isInteger(id) && id > 0 ? id : -1} />;
}
