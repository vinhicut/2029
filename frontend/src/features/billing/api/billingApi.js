/**
 * API client for Billing and SePay integration
 */

export async function createBillingOrder({ amount, description, serviceType = 'consultation', userId = null }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tuvi_token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/billing/orders', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      amount,
      description,
      service_type: serviceType,
      user_id: userId
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể khởi tạo đơn hàng thanh toán.');
  }
  return data;
}

export async function confirmSandboxOrder(orderCode) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tuvi_token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/billing/sandbox/confirm', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ order_code: orderCode })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể xác nhận thanh toán giả lập.');
  }
  return data;
}

export async function checkOrderStatus(orderCodeOrId) {
  const response = await fetch(`/api/billing/orders/${encodeURIComponent(orderCodeOrId)}/status`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể kiểm tra trạng thái thanh toán.');
  }
  return data;
}

export async function getBillingConfig() {
  const response = await fetch('/api/billing/config');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể tải thông tin ngân hàng.');
  }
  return data;
}

export async function fetchAccountQuota() {
  const token = localStorage.getItem('tuvi_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch('/api/ai/user-quota', { headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Không thể kiểm tra số lượt khả dụng.');
  }
  return data;
}
