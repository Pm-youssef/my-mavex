export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  stock: number
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  /** Optional duplicate for components expecting imageUrl in localStorage */
  imageUrl?: string
  quantity: number
  /** Size variant for the item if applicable */
  size?: string
}

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  total: number
  status: OrderStatus
  paymobOrderId?: string
  paymobTransactionId?: string
  items: OrderItem[]
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  price: number
  quantity: number
  product: Product
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface PaymobOrder {
  id: number
  amount_cents: number
  currency: string
  merchant_order_id: string
  created_at: string
  items: any[]
}

export interface PaymobPaymentKey {
  token: string
  amount_cents: number
  currency: string
  integration_id: number
  order_id: number
  billing_data: {
    first_name: string
    last_name: string
    email: string
    phone_number: string
    street: string
    city: string
    country: string
    apartment: string
    floor: string
    postal_code: string
    building: string
    shipping_method: string
    state: string
  }
}

export interface PaymobWebhook {
  type: string
  obj: {
    id: number
    amount_cents: number
    currency: string
    merchant_order_id: string
    success: boolean
    is_void: boolean
    is_refunded: boolean
    is_captured: boolean
    is_standalone_payment: boolean
    is_voided: boolean
    created_at: string
    updated_at: string
    pending: boolean
    source_data: any
    is_3d_secure: boolean
    integration_id: number
    profile_id: number
    has_parent_transaction: boolean
    order: PaymobOrder
    parent_transaction: any
    owner: number
    error_occured: boolean
    data: any
    is_refund: boolean
    is_capture: boolean
    is_standalone: boolean
    is_standalone_refund: boolean
    is_standalone_capture: boolean
    is_standalone_void: boolean
    is_standalone_voided: boolean
    is_standalone_captured: boolean
    is_standalone_standalone: boolean
    is_standalone_standalone_payment: boolean
    is_standalone_standalone_refund: boolean
    is_standalone_standalone_capture: boolean
    is_standalone_standalone_void: boolean
    is_standalone_standalone_voided: boolean
    is_standalone_standalone_refunded: boolean
    is_standalone_standalone_captured: boolean
    is_standalone_standalone_standalone: boolean
  }
}

export interface CheckoutFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
}

export interface AdminProductFormData {
  name: string
  description: string
  price: number
  image: string
  stock: number
}
