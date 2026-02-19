// client/src/components/Projects/StripePaymentModal.jsx

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import axios from 'axios';

// ── Card form (rendered inside <Elements>) ────────────────────────────────────
const CheckoutForm = ({ clientSecret, paymentIntentId, onSuccess, onError, onClose }) => {
    const stripe   = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [cardError, setCardError] = useState('');

    const handlePay = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setCardError('');

        const cardElement = elements.getElement(CardElement);

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: { card: cardElement },
        });

        if (error) {
            setCardError(error.message);
            setLoading(false);
            return;
        }

        if (paymentIntent.status === 'succeeded') {
            // Verify on backend and create the project
            try {
                const res = await axios.post('/api/payment/verify', { paymentIntentId });
                if (res.data.success) {
                    onSuccess();
                } else {
                    onError(res.data.error || 'Verification failed');
                }
            } catch {
                onError('Server error during verification. Contact support.');
            }
        } else {
            onError(`Unexpected payment status: ${paymentIntent.status}`);
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handlePay} style={styles.form}>
            <p style={styles.subtitle}>Pay ₹99 to unlock your 4th project slot</p>

            <div style={styles.cardBox}>
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#ffffff',
                                '::placeholder': { color: '#aab7c4' },
                            },
                            invalid: { color: '#fa755a' },
                        },
                    }}
                />
            </div>

            {cardError && <p style={styles.errorText}>{cardError}</p>}

            <p style={styles.testHint}>
                Test card: <code>4000 0035 6000 0008</code> · Any future exp · Any CVV
            </p>

            <div style={styles.btnRow}>
                <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={loading}>
                    Cancel
                </button>
                <button type="submit" style={styles.payBtn} disabled={loading || !stripe}>
                    {loading ? 'Processing…' : 'Pay ₹99'}
                </button>
            </div>
        </form>
    );
};

// ── Modal wrapper ─────────────────────────────────────────────────────────────
const StripePaymentModal = ({ clientSecret, paymentIntentId, publishableKey, onSuccess, onError, onClose }) => {
    const stripePromise = loadStripe(publishableKey);

    return (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={styles.modal}>
                <h2 style={styles.title}>Complete Payment</h2>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm
                        clientSecret={clientSecret}
                        paymentIntentId={paymentIntentId}
                        onSuccess={onSuccess}
                        onError={onError}
                        onClose={onClose}
                    />
                </Elements>
            </div>
        </div>
    );
};

export default StripePaymentModal;

// ── Inline styles ─────────────────────────────────────────────────────────────
const styles = {
    overlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
    },
    modal: {
        background: '#1e1e2e',
        border: '1px solid #6c63ff',
        borderRadius: '12px',
        padding: '32px',
        width: '100%',
        maxWidth: '420px',
        color: '#fff',
    },
    title: {
        margin: '0 0 8px',
        fontSize: '20px',
        color: '#a78bfa',
    },
    subtitle: {
        margin: '0 0 20px',
        color: '#94a3b8',
        fontSize: '14px',
    },
    cardBox: {
        background: '#2d2d3d',
        border: '1px solid #6c63ff55',
        borderRadius: '8px',
        padding: '14px 12px',
        marginBottom: '12px',
    },
    errorText: {
        color: '#fa755a',
        fontSize: '13px',
        margin: '4px 0 8px',
    },
    testHint: {
        color: '#64748b',
        fontSize: '12px',
        marginBottom: '20px',
    },
    btnRow: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
    },
    cancelBtn: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: '1px solid #475569',
        background: 'transparent',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '14px',
    },
    payBtn: {
        padding: '10px 24px',
        borderRadius: '8px',
        border: 'none',
        background: '#6c63ff',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
    },
};
