// client/src/components/Projects/StripePaymentModal.jsx
// Uses real Stripe Elements for PCI-compliant card collection

import React, { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import '../../styles/PaymentStyles.css';

// ── Stripe Element styling (matches the dark theme) ────────────────────────
const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            color: '#ffffff',
            fontFamily: "'Monaco', 'Courier New', monospace",
            fontSize: '15px',
            '::placeholder': { color: 'rgba(255, 255, 255, 0.3)' },
        },
        invalid: {
            color: '#ff6b6b',
            iconColor: '#ff6b6b',
        },
    },
    hidePostalCode: true,
};

// ── Sub-components ──────────────────────────────────────────────────────────

const PaymentSummary = ({ paymentType, amount }) => (
    <div className="payment-price-box">
        <p className="payment-price-label">
            {paymentType === 'project_extension' ? 'Deadline Extension Charge' : 'Project Creation Charge'}
        </p>
        <p className="payment-price-amount">Rs {Number(amount).toFixed(2)}</p>
    </div>
);

const PaymentProcessing = () => (
    <div className="payment-loading">
        <div className="payment-spinner"></div>
        <p className="payment-loading-text">Processing your payment securely...</p>
    </div>
);

const PaymentSuccess = ({ paymentIntentId, onClose }) => (
    <div className="payment-success">
        <div className="payment-success-icon">✓</div>
        <h3 className="payment-success-title">Payment Successful</h3>
        <p className="payment-success-message">Your request has been completed successfully.</p>
        <div className="payment-success-details">
            <strong>Reference:</strong> {String(paymentIntentId).slice(0, 22)}...
        </div>
        <div className="payment-success-actions">
            <button onClick={onClose} className="payment-btn payment-btn-success" type="button">
                Continue
            </button>
        </div>
    </div>
);

// ── Mock Payment Form (when Stripe keys are invalid / development) ──────────
const MockPaymentForm = ({ paymentIntentId, amount, onProcessing, onSuccess, onError, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ holderName: '', cardNumber: '', expiry: '', cvv: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const verifyOnBackend = async () => {
        const res = await axios.post('/api/payment/verify', { paymentIntentId }, { withCredentials: true });
        if (!res.data?.success) throw new Error(res.data?.error || 'Verification failed');
        return res.data;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.holderName.trim() || !form.cardNumber.trim() || !form.expiry.trim() || !form.cvv.trim()) {
            setError('Please fill all card fields.');
            return;
        }
        setLoading(true);
        setError('');
        onProcessing(true);
        try {
            await new Promise((r) => setTimeout(r, 1600));
            const verifyData = await verifyOnBackend();
            onSuccess(verifyData);
        } catch (err) {
            const message = err?.response?.data?.error || err?.message || 'Payment failed';
            onError(message);
            onProcessing(false);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="payment-form">
            <div className="payment-form-group">
                <label className="payment-form-label">Cardholder Name</label>
                <input type="text" name="holderName" value={form.holderName} onChange={handleChange} className="payment-form-input" placeholder="John Doe" disabled={loading} required />
            </div>
            <div className="payment-form-group">
                <label className="payment-form-label">Card Number</label>
                <input type="text" name="cardNumber" value={form.cardNumber} onChange={handleChange} className="payment-form-input" placeholder="4111 1111 1111 1111" disabled={loading} required />
            </div>
            <div className="payment-form-row">
                <div className="payment-form-group">
                    <label className="payment-form-label">Expiry</label>
                    <input type="text" name="expiry" value={form.expiry} onChange={handleChange} className="payment-form-input" placeholder="MM/YY" disabled={loading} required />
                </div>
                <div className="payment-form-group">
                    <label className="payment-form-label">CVV</label>
                    <input type="password" name="cvv" value={form.cvv} onChange={handleChange} className="payment-form-input" placeholder="123" disabled={loading} required />
                </div>
            </div>
            {error && (<div className="payment-error"><p className="payment-error-message">{error}</p></div>)}
            <div className="payment-test-mode">
                <strong>Mock/Demo Payment</strong>
                <div className="payment-test-card-info">Stripe keys not configured. Using simulated payment. No real charge.</div>
            </div>
            <div className="payment-actions">
                <button type="button" className="payment-btn payment-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                <button type="submit" className="payment-btn payment-btn-pay" disabled={loading}>
                    {loading ? 'Processing...' : `Pay Rs ${Number(amount).toFixed(2)}`}
                </button>
            </div>
        </form>
    );
};

// ── Real Stripe Payment Form (CardElement + confirmCardPayment) ─────────────
const StripePaymentForm = ({ clientSecret, paymentIntentId, amount, onProcessing, onSuccess, onError, onClose }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cardComplete, setCardComplete] = useState(false);

    const verifyOnBackend = async () => {
        const res = await axios.post('/api/payment/verify', { paymentIntentId }, { withCredentials: true });
        if (!res.data?.success) throw new Error(res.data?.error || 'Verification failed');
        return res.data;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setError('Card element not loaded. Please try again.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Confirm the payment with Stripe using the card data
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                },
            });

            if (stripeError) {
                // Card declined, invalid, etc.
                throw new Error(stripeError.message || 'Card payment failed');
            }

            if (paymentIntent.status !== 'succeeded') {
                throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
            }

            // 2. Payment succeeded on Stripe — now tell our backend to create the project / extend deadline
            onProcessing(true);
            const verifyData = await verifyOnBackend();
            onSuccess(verifyData);
        } catch (err) {
            const message = err?.response?.data?.error || err?.message || 'Payment failed';
            setError(message);
            onError(message);
            onProcessing(false);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="payment-form">
            <div className="payment-form-group">
                <label className="payment-form-label">Card Details</label>
                <div className="payment-card-element-wrapper">
                    <CardElement
                        options={CARD_ELEMENT_OPTIONS}
                        onChange={(event) => {
                            setCardComplete(event.complete);
                            if (event.error) {
                                setError(event.error.message);
                            } else {
                                setError('');
                            }
                        }}
                    />
                </div>
            </div>

            {error && (
                <div className="payment-error">
                    <p className="payment-error-message">{error}</p>
                </div>
            )}

            <div className="payment-test-mode">
                <strong>Stripe Test Mode</strong>
                <div className="payment-test-card-info">
                    Use test card: 4242 4242 4242 4242 | Any future date | Any 3-digit CVC
                </div>
            </div>

            <div className="payment-security-info">
                <span>🔒 Payment is processed securely by Stripe. Card details never touch our server.</span>
            </div>

            <div className="payment-actions">
                <button type="button" className="payment-btn payment-btn-cancel" onClick={onClose} disabled={loading}>
                    Cancel
                </button>
                <button
                    type="submit"
                    className="payment-btn payment-btn-pay"
                    disabled={loading || !stripe || !cardComplete}
                >
                    {loading ? 'Processing...' : `Pay Rs ${Number(amount).toFixed(2)}`}
                </button>
            </div>
        </form>
    );
};

// ── Main Modal Component ────────────────────────────────────────────────────

const StripePaymentModal = ({
    clientSecret,
    paymentIntentId,
    publishableKey,
    mockMode,
    paymentType,
    amount = 99,
    title = 'Complete Payment',
    onSuccess,
    onError,
    onClose,
}) => {
    const [state, setState] = useState('form'); // 'form' | 'loading' | 'success'

    // Load the Stripe instance once (memoised by publishable key)
    const stripePromise = useMemo(() => {
        if (mockMode || !publishableKey) return null;
        return loadStripe(publishableKey);
    }, [publishableKey, mockMode]);

    const handleProcessing = (processing) => setState(processing ? 'loading' : 'form');

    const handleSuccess = (result) => {
        setState('success');
        setTimeout(() => onSuccess(result || { purpose: paymentType }), 1100);
    };

    const handleError = (message) => {
        setState('form');
        onError(message);
    };

    const renderForm = () => {
        if (mockMode || !stripePromise) {
            // Fallback: no valid Stripe keys — use mock form
            return (
                <MockPaymentForm
                    paymentIntentId={paymentIntentId}
                    amount={amount}
                    onProcessing={handleProcessing}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onClose={onClose}
                />
            );
        }

        // Real Stripe Elements form
        return (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripePaymentForm
                    clientSecret={clientSecret}
                    paymentIntentId={paymentIntentId}
                    amount={amount}
                    onProcessing={handleProcessing}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onClose={onClose}
                />
            </Elements>
        );
    };

    return (
        <div className="payment-overlay" onClick={(e) => e.target === e.currentTarget && state !== 'loading' && onClose()}>
            <div className="payment-modal">
                <div className="payment-header">
                    <h2 className="payment-title">{title}</h2>
                    <button className="payment-close-btn" type="button" onClick={onClose} disabled={state === 'loading'}>
                        ×
                    </button>
                </div>

                <PaymentSummary paymentType={paymentType} amount={amount} />

                {state === 'loading' && <PaymentProcessing />}
                {state === 'success' && <PaymentSuccess paymentIntentId={paymentIntentId} onClose={onClose} />}
                {state === 'form' && renderForm()}
            </div>
        </div>
    );
};

export default StripePaymentModal;
