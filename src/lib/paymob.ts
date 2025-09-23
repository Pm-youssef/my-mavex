interface PaymobOrderRequest {
  auth_token: string
  delivery_needed: boolean
  amount_cents: number
  currency: string
  merchant_order_id: string
  items: Array<{
    name: string
    amount_cents: number
    quantity: number
  }>
}

interface PaymobOrderResponse {
  id: number
  amount_cents: number
  currency: string
  merchant_order_id: string
  payment_key: string
}

interface PaymobPaymentKeyRequest {
  auth_token: string
  amount_cents: number
  expiration: number
  order_id: number
  billing_data: {
    first_name: string
    last_name: string
    email: string
    phone_number: string
    country: string
    currency: string
  }
  currency: string
  integration_id: number
}

export class PaymobService {
  private apiKey: string
  private integrationId: number
  private iframeId: number

  constructor() {
    this.apiKey = process.env.PAYMOB_API_KEY!
    this.integrationId = parseInt(process.env.PAYMOB_INTEGRATION_ID!)
    this.iframeId = parseInt(process.env.PAYMOB_IFRAME_ID!)
  }

  async getAuthToken(): Promise<string> {
    const response = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
      }),
    })

    const data = await response.json()
    return data.token
  }

  async createOrder(orderData: {
    amount: number
    merchantOrderId: string
    items: Array<{ name: string; price: number; quantity: number }>
  }): Promise<PaymobOrderResponse> {
    const authToken = await this.getAuthToken()

    const response = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: Math.round(orderData.amount * 100),
        currency: 'EGP',
        merchant_order_id: orderData.merchantOrderId,
        items: orderData.items.map(item => ({
          name: item.name,
          amount_cents: Math.round(item.price * 100),
          quantity: item.quantity,
        })),
      }),
    })

    return response.json()
  }

  async createPaymentKey(orderData: {
    orderId: number
    amount: number
    customerName: string
    customerEmail: string
    customerPhone: string
  }): Promise<string> {
    const authToken = await this.getAuthToken()

    const response = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: Math.round(orderData.amount * 100),
        expiration: 3600,
        order_id: orderData.orderId,
        billing_data: {
          first_name: orderData.customerName.split(' ')[0] || orderData.customerName,
          last_name: orderData.customerName.split(' ').slice(1).join(' ') || '',
          email: orderData.customerEmail,
          phone_number: orderData.customerPhone,
          country: 'EG',
          currency: 'EGP',
        },
        currency: 'EGP',
        integration_id: this.integrationId,
      }),
    })

    const data = await response.json()
    return data.token
  }

  getIframeUrl(paymentKey: string): string {
    return `https://accept.paymob.com/api/acceptance/iframes/${this.iframeId}?payment_token=${paymentKey}`
  }
} 