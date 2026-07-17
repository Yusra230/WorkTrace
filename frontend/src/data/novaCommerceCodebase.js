export const novaCommerceCodebase = {
  files: [
    {
      path: 'frontend/Checkout.js',
      language: 'javascript',
      content: `export async function submitPayment(paymentDetails) {
  const response = await fetch('/api/payment/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentDetails)
  });

  if (!response.ok) {
    throw new Error('Payment could not be confirmed.');
  }

  return response.json();
}`
    },
    {
      path: 'frontend/Cart.js',
      language: 'javascript',
      content: `export function calculateCartTotal(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}`
    },
    {
      path: 'backend/routes/checkout.js',
      language: 'javascript',
      content: `router.post('/payment/confirm', async (req, res) => {
  const result = await paymentProvider.confirm(req.body);
  res.status(200).json(result);
});`
    }
  ]
};
