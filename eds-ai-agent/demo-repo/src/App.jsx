import React from 'react';
import Header from './components/Header';
import PaymentForm from './components/PaymentForm';
import AddressForm from './components/AddressForm';
import GoodButton from './components/GoodButton';
import Card from './components/Card';

function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4' }}>
      <Header />

      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '32px',
          marginBottom: '24px',
          color: '#161616'  // Good - uses correct Carbon color
        }}>
          Demo Components
        </h1>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            Payment Form (Multiple Violations)
          </h2>
          <div style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '4px',
            maxWidth: '400px'
          }}>
            <PaymentForm />
          </div>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            Address Form (Multiple Violations)
          </h2>
          <AddressForm />
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            Good Button (Carbon Compliant)
          </h2>
          <div style={{ display: 'flex', gap: '16px' }}>
            <GoodButton>Primary Action</GoodButton>
            <GoodButton variant="secondary">Secondary Action</GoodButton>
            <GoodButton variant="danger">Delete</GoodButton>
          </div>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            Cards (Minor Violations)
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            <Card
              title="Product One"
              description="This is a sample product card with some description text."
              onClick={() => {}}
            />
            <Card
              title="Product Two"
              description="Another product card demonstrating the card component."
              onClick={() => {}}
            />
            <Card
              title="Product Three"
              description="A third card to show the grid layout."
              onClick={() => {}}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
