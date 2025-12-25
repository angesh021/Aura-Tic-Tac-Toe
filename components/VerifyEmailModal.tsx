
import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { CheckCircleIcon, AlertIcon } from './Icons';
import { API_URL } from '../utils/config';

interface VerifyEmailModalProps {
    token: string;
    onClose: () => void;
}

const VerifyEmailModal: React.FC<VerifyEmailModalProps> = ({ token, onClose }) => {
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

    useEffect(() => {
        const verify = async () => {
            try {
                const res = await fetch(`${API_URL}/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                if (res.ok) {
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            } catch (e) {
                setStatus('error');
            }
        };
        verify();
    }, [token]);

    return (
        <Modal onClose={onClose} className="max-w-md text-center">
            <div className="p-6">
                {status === 'verifying' && (
                    <>
                        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"/>
                        <h2 className="text-xl font-bold text-white">Verifying Email...</h2>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500 border border-green-500/30">
                            <CheckCircleIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Verified!</h2>
                        <p className="text-gray-400 mb-6">Your email has been successfully verified.</p>
                        <button onClick={onClose} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors shadow-lg">
                            Continue to Login
                        </button>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 border border-red-500/30">
                            <AlertIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
                        <p className="text-gray-400 mb-6">The link may be invalid or expired.</p>
                        <button onClick={onClose} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors">
                            Close
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default VerifyEmailModal;
