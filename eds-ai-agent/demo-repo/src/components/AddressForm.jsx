import React, { useState } from 'react';

// Another component with Carbon Design System violations

function AddressForm() {
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: ''
  });

  const handleChange = (e) => {
    setAddress({
      ...address,
      [e.target.name]: e.target.value
    });
  };

  // Inline styles with hardcoded values - should use Carbon tokens
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',  // Should use spacing tokens
    marginBottom: '16px',
    border: '1px solid #d0d0d0',  // Should use border.default token
    borderRadius: '4px',
    fontSize: '14px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontWeight: '500',
    color: '#444444'  // Should use text.primary token
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px' }}>
      <h3 style={{
        marginBottom: '24px',
        color: '#1a1a1a',
        fontSize: '20px'
      }}>
        Shipping Address
      </h3>

      <div>
        <label style={labelStyle}>Street Address</label>
        {/* Custom input - should use Carbon TextInput */}
        <input
          type="text"
          name="street"
          value={address.street}
          onChange={handleChange}
          style={inputStyle}
          placeholder="123 Main Street"
        />
      </div>

      <div>
        <label style={labelStyle}>City</label>
        <input
          type="text"
          name="city"
          value={address.city}
          onChange={handleChange}
          style={inputStyle}
          placeholder="New York"
        />
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>State</label>
          {/* Custom select - should use Carbon Dropdown */}
          <select
            name="state"
            value={address.state}
            onChange={handleChange}
            style={{
              ...inputStyle,
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="">Select state</option>
            <option value="NY">New York</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>ZIP Code</label>
          <input
            type="text"
            name="zip"
            value={address.zip}
            onChange={handleChange}
            style={inputStyle}
            placeholder="10001"
          />
        </div>
      </div>

      {/* Custom button - should use Carbon Button */}
      <button
        type="button"
        style={{
          background: '#2196F3',  // Should use interactive.primary token
          color: '#fff',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          marginTop: '8px'
        }}
      >
        Save Address
      </button>
    </div>
  );
}

export default AddressForm;
