import React from 'react';

// Card component with hardcoded styles - should use Carbon Tile

function Card({ title, description, image, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#ffffff',
        borderRadius: '8px',  // Should use Carbon borderRadius tokens (4px)
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',  // Should use Carbon shadow tokens
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
    >
      {image && (
        <img
          src={image}
          alt={title}
          style={{
            width: '100%',
            height: '160px',
            objectFit: 'cover'
          }}
        />
      )}

      <div style={{ padding: '16px' }}>  {/* Good - uses standard spacing */}
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1a1a1a',  // Should use text.primary token
          marginBottom: '8px'
        }}>
          {title}
        </h3>

        <p style={{
          fontSize: '14px',
          color: '#6f6f6f',  // Good - matches text.secondary
          lineHeight: '1.5'
        }}>
          {description}
        </p>

        {onClick && (
          <button
            style={{
              marginTop: '16px',
              background: 'transparent',
              border: '1px solid #0f62fe',  // Good - uses interactive.primary
              color: '#0f62fe',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Learn More
          </button>
        )}
      </div>
    </div>
  );
}

export default Card;
