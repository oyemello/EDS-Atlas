import React from 'react';

// This component has multiple Carbon Design System violations
// Used for demonstration purposes

function PaymentForm() {
  return (
    <form style={{ padding: '16px' }}>  {/* Should use tokens.spacing.lg */}
      <h2 style={{
        fontSize: '24px',  /* Should use Carbon typography tokens */
        color: '#333333',   /* Should use tokens.color.text.primary (#161616) */
        marginBottom: '20px'
      }}>
        Payment Details
      </h2>

      <div style={{ marginBottom: '12px' }}>  {/* Should use tokens.spacing.md or lg */}
        <label style={{
          display: 'block',
          marginBottom: '4px',
          color: '#666666'  /* Should use tokens.color.text.secondary (#525252) */
        }}>
          Card Number
        </label>
        <input
          type="text"
          placeholder="1234 5678 9012 3456"
          style={{
            width: '100%',
            padding: '10px 12px',  /* Non-standard spacing */
            background: '#006FCF',  /* Should use tokens.color.interactive.primary (#0f62fe) */
            color: '#FFFFFF',       /* Should use tokens.color.text.onPrimary */
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#666666' }}>
            Expiry Date
          </label>
          <input
            type="text"
            placeholder="MM/YY"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#f0f0f0',  /* Should use tokens.color.background.layer01 (#f4f4f4) */
              border: '1px solid #cccccc',  /* Should use tokens.color.border.default (#e0e0e0) */
              borderRadius: '4px'
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#666666' }}>
            CVV
          </label>
          <input
            type="text"
            placeholder="123"
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#f0f0f0',
              border: '1px solid #cccccc',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        style={{
          width: '100%',
          background: '#FF0000',  /* Custom red - should use tokens.color.interactive.danger (#da1e28) */
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Pay Now
      </button>

      <p style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#999999',  /* Poor contrast - accessibility issue */
        textAlign: 'center'
      }}>
        Your payment is secure and encrypted
      </p>
    </form>
  );
}

export default PaymentForm;
