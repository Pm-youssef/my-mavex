// Local minimal types to avoid coupling with '@/types' and prevent TS path issues
export interface ApiProduct {
  id: string
  name: string
  originalPrice: number
  discountedPrice: number
  imageUrl: string
  stock: number
}

export interface CheckoutFormDataLite {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress?: string
  customerCity?: string
  customerGovernorate?: string
  customerPostalCode?: string
  paymentMethod?: string
  shippingMethod?: string
}

const API_BASE = '/api'

export async function fetchProducts(): Promise<ApiProduct[]> {
  const response = await fetch(`${API_BASE}/products`)
  if (!response.ok) {
    throw new Error('فشل في جلب المنتجات')
  }
  return response.json()
}

export async function fetchProduct(id: string): Promise<ApiProduct> {
  const response = await fetch(`${API_BASE}/products/${id}`)
  if (!response.ok) {
    throw new Error('فشل في جلب المنتج')
  }
  return response.json()
}

export async function createProduct(productData: Omit<ApiProduct, 'id' | 'stock'> & Partial<ApiProduct>): Promise<ApiProduct> {
  const response = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  })
  if (!response.ok) {
    throw new Error('فشل في إنشاء المنتج')
  }
  return response.json()
}

export async function updateProduct(id: string, productData: Partial<ApiProduct>): Promise<ApiProduct> {
  const response = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  })
  if (!response.ok) {
    throw new Error('فشل في تحديث المنتج')
  }
  return response.json()
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('فشل في حذف المنتج')
  }
}

export async function createCheckout(checkoutData: CheckoutFormDataLite & { items: any[] }): Promise<{ iframeUrl: string }> {
  const response = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(checkoutData),
  })
  if (!response.ok) {
    throw new Error('فشل في إنشاء الطلبية')
  }
  return response.json()
}

export async function adminLogin(password: string): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })
  if (!response.ok) {
    throw new Error('كلمة المرور غير صحيحة')
  }
  return response.json()
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error('فشل في رفع الصورة')
  }
  return response.json()
}
