// client/src/components/User/OnboardingToast.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../styles/OnboardingToast.css';

// Total onboarding duration: ~70 seconds across 3 toasts
const TOAST_DURATIONS = {
    welcome: 15000,      // 15 seconds
    platform: 25000,     // 25 seconds  
    profile: 30000       // 30 seconds (has action button)
};

// Home page onboarding steps (shown SEQUENTIALLY, one at a time)
const HOME_ONBOARDING_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to RelabTeams',
        message: 'We\'re excited to have you join our community of learners and innovators. Click to continue.',
        icon: '•',
        type: 'welcome',
        clickAction: 'next' // Clicking advances to next toast
    },
    {
        id: 'platform',
        title: 'What is RelabTeams?',
        message: [
            '• Collaborate on real projects with peers and mentors',
            '• Build your portfolio and develop in-demand skills',
            '• Connect with opportunities and grow your network'
        ],
        icon: '•',
        type: 'info',
        clickAction: 'next'
    },
    {
        id: 'profile',
        title: 'Complete Your Profile',
        message: 'Set up your profile to unlock all features and help others find you for collaborations.',
        icon: '•',
        type: 'action',
        clickAction: '/profile?onboarding=true',
        actionText: 'Update Profile',
        projectsPath: '/project'
    }
];

// Single toast component with click and hover support
const Toast = ({ toast, onClick, onDismiss, onSkip, userName, progress }) => {
    const isClickable = !!toast.clickAction;
    
    const handleToastClick = (e) => {
        // Don't trigger if clicking the close button or skip button
        if (e.target.closest('.onboarding-toast-close') || e.target.closest('.onboarding-toast-skip-btn')) {
            return;
        }
        if (isClickable) {
            onClick(toast.clickAction);
        }
    };

    return (
        <div 
            className={`onboarding-toast onboarding-toast-${toast.type} ${toast.exiting ? 'onboarding-toast-exit' : ''} ${isClickable ? 'onboarding-toast-clickable' : ''}`}
            onClick={handleToastClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
        >
            <div className="onboarding-toast-header">
                <span className="onboarding-toast-icon">{toast.icon}</span>
                <h4 className="onboarding-toast-title">
                    {toast.id === 'welcome' && userName 
                        ? `Welcome to RelabTeams, ${userName}! 🎉` 
                        : toast.title}
                </h4>
                <button 
                    className="onboarding-toast-close"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss();
                    }}
                    aria-label="Dismiss"
                >
                    ×
                </button>
            </div>
            
            <div className="onboarding-toast-body">
                {Array.isArray(toast.message) ? (
                    <ul className="onboarding-toast-list">
                        {toast.message.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p>{toast.message}</p>
                )}
            </div>

            {toast.type === 'action' && toast.actionText && (
                <div className="onboarding-toast-actions">
                    <button 
                        className="onboarding-toast-action-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(toast.clickAction);
                        }}
                    >
                        {toast.actionText}
                    </button>
                    <button 
                        className="onboarding-toast-skip-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSkip();
                        }}
                    >
                        Maybe Later
                    </button>
                </div>
            )}

            {isClickable && toast.type !== 'action' && (
                <div className="onboarding-toast-click-hint">
                    Click to continue →
                </div>
            )}

            <div className="onboarding-toast-progress">
                <div 
                    className="onboarding-toast-progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

// Main Onboarding Toast Component for Home Page (Sequential, one at a time)
export const OnboardingToast = ({ userName, onComplete, profileComplete: initialProfileComplete }) => {
    const navigate = useNavigate();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [currentToast, setCurrentToast] = useState(null);
    const [progress, setProgress] = useState(100);
    const [isCompleting, setIsCompleting] = useState(false);
    const [profileComplete, setProfileComplete] = useState(initialProfileComplete);
    const [isLoading, setIsLoading] = useState(true);
    const timerRef = useRef(null);
    const progressRef = useRef(null);

    // Fetch fresh profile completion status on mount
    useEffect(() => {
        const checkProfileStatus = async () => {
            try {
                const response = await axios.get('/api/home');
                if (response.data.success && response.data.user) {
                    setProfileComplete(response.data.user.isProfileComplete === true);
                }
            } catch (err) {
                console.error('Error checking profile status:', err);
                setProfileComplete(initialProfileComplete);
            } finally {
                setIsLoading(false);
            }
        };
        checkProfileStatus();
    }, [initialProfileComplete]);

    // Mark onboarding as complete in the backend
    const markOnboardingComplete = useCallback(async () => {
        if (isCompleting) return;
        setIsCompleting(true);
        
        try {
            await axios.post('/api/complete-onboarding');
        } catch (err) {
            console.error('Failed to mark onboarding complete:', err);
        }
        
        if (onComplete) {
            onComplete();
        }
    }, [isCompleting, onComplete]);

    // If profile is already complete, show quick toast and redirect to projects
    useEffect(() => {
        if (isLoading) return; // Wait for profile status check to complete
        
        if (profileComplete) {
            setCurrentToast({
                id: 'profile-complete-redirect',
                title: 'Your profile is all set',
                message: 'Click here to explore projects and find the perfect match for your skills.',
                icon: '•',
                type: 'info',
                clickAction: '/project'
            });
            setProgress(100);

            progressRef.current = setInterval(() => {
                setProgress(prev => Math.max(0, prev - (100 / 50)));
            }, 100);

            timerRef.current = setTimeout(() => {
                clearInterval(progressRef.current);
                markOnboardingComplete();
                navigate('/project');
            }, 5000);

            return () => {
                clearTimeout(timerRef.current);
                clearInterval(progressRef.current);
            };
        }
    }, [isLoading, profileComplete, navigate, markOnboardingComplete]);

    // Advance to next toast
    const advanceToNext = useCallback(() => {
        setCurrentToast(prev => prev ? { ...prev, exiting: true } : null);
        
        setTimeout(() => {
            if (currentStepIndex < HOME_ONBOARDING_STEPS.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
            } else {
                setCurrentToast(null);
                markOnboardingComplete();
            }
        }, 300);
    }, [currentStepIndex, markOnboardingComplete]);

    // Show toasts sequentially (one at a time)
    useEffect(() => {
        if (isLoading) return; // Wait for profile status check
        if (profileComplete) return; // Profile complete, don't show onboarding steps
        
        if (currentStepIndex >= HOME_ONBOARDING_STEPS.length) {
            // All toasts shown without action - mark complete
            markOnboardingComplete();
            return;
        }

        const step = HOME_ONBOARDING_STEPS[currentStepIndex];
        const duration = TOAST_DURATIONS[step.id] || 20000;
        
        setCurrentToast({ ...step, exiting: false });
        setProgress(100);

        // Animate progress bar
        progressRef.current = setInterval(() => {
            setProgress(prev => Math.max(0, prev - (100 / (duration / 100))));
        }, 100);

        // Auto-advance to next toast after duration
        timerRef.current = setTimeout(() => {
            clearInterval(progressRef.current);
            advanceToNext();
        }, duration);

        return () => {
            clearTimeout(timerRef.current);
            clearInterval(progressRef.current);
        };
    }, [isLoading, currentStepIndex, profileComplete, advanceToNext, markOnboardingComplete]);

    // Handle toast click
    const handleToastClick = useCallback((action) => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        
        if (action === 'next') {
            advanceToNext();
        } else if (typeof action === 'string' && action.startsWith('/')) {
            // Navigate to a path
            setCurrentToast(null);
            navigate(action);
        }
    }, [advanceToNext, navigate]);

    // Dismiss current toast
    const handleDismiss = useCallback(() => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        advanceToNext();
    }, [advanceToNext]);

    // Skip all remaining onboarding
    const handleSkipAll = useCallback(() => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        setCurrentToast(prev => prev ? { ...prev, exiting: true } : null);
        
        setTimeout(() => {
            setCurrentToast(null);
            markOnboardingComplete();
        }, 300);
    }, [markOnboardingComplete]);

    // Don't render anything while loading or if no toast
    if (isLoading || !currentToast) return null;

    return (
        <div className="onboarding-toast-container">
            <Toast 
                toast={currentToast}
                onClick={handleToastClick}
                onDismiss={handleDismiss}
                onSkip={handleSkipAll}
                userName={userName}
                progress={progress}
            />
        </div>
    );
};

// Profile Page Onboarding Toast Component - with progress bar and clickable
export const ProfileOnboardingToast = ({ onComplete, missingFields = [] }) => {
    const [currentToast, setCurrentToast] = useState(null);
    const [progress, setProgress] = useState(100);
    const timerRef = useRef(null);
    const progressRef = useRef(null);

    const dismissToast = () => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        setCurrentToast(prev => prev ? { ...prev, exiting: true } : null);
        setTimeout(() => {
            setCurrentToast(null);
            if (onComplete) onComplete();
        }, 300);
    };

    useEffect(() => {
        // Default to all 5 required fields if none provided
        const fieldsList = missingFields.length > 0 
            ? missingFields.join(', ')
            : 'About Me, Skills, Interests, Profile Picture, and Resume';
        
        setCurrentToast({
            id: 'profile-guide',
            title: 'Complete Your Profile',
            message: `Please fill in the following to get started: ${fieldsList}. This helps others discover you for project collaborations.`,
            icon: '•',
            type: 'info'
        });

        progressRef.current = setInterval(() => {
            setProgress(prev => Math.max(0, prev - (100 / 150)));
        }, 100);

        timerRef.current = setTimeout(() => {
            clearInterval(progressRef.current);
            setCurrentToast(prev => prev ? { ...prev, exiting: true } : null);
            setTimeout(() => {
                setCurrentToast(null);
                if (onComplete) onComplete();
            }, 300);
        }, 15000);

        return () => {
            clearTimeout(timerRef.current);
            clearInterval(progressRef.current);
        };
    }, [missingFields]);

    if (!currentToast) return null;

    return (
        <div className="onboarding-toast-container">
            <div 
                className={`onboarding-toast onboarding-toast-${currentToast.type} onboarding-toast-clickable ${currentToast.exiting ? 'onboarding-toast-exit' : ''}`}
                onClick={dismissToast}
                role="button"
                tabIndex={0}
            >
                <div className="onboarding-toast-header">
                    <span className="onboarding-toast-icon">{currentToast.icon}</span>
                    <h4 className="onboarding-toast-title">{currentToast.title}</h4>
                    <button 
                        className="onboarding-toast-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            dismissToast();
                        }}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
                <div className="onboarding-toast-body">
                    <p>{currentToast.message}</p>
                </div>
                <div className="onboarding-toast-click-hint">
                    Click to dismiss →
                </div>
                <div className="onboarding-toast-progress">
                    <div 
                        className="onboarding-toast-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

// Profile Success Toast Component (shown after completing profile) - CLICKABLE
export const ProfileSuccessToast = ({ onComplete }) => {
    const navigate = useNavigate();
    const [currentToast, setCurrentToast] = useState(null);
    const [progress, setProgress] = useState(100);
    const timerRef = useRef(null);
    const progressRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Prevent double initialization
        if (isInitialized) return;
        setIsInitialized(true);
        
        console.log('ProfileSuccessToast mounted - showing success toast');
        
        setCurrentToast({
            id: 'profile-success',
            title: 'Profile Complete',
            message: 'Now go find your interest in projects and start collaborating with amazing teams!',
            icon: '•',
            type: 'success',
            clickAction: '/project'
        });

        progressRef.current = setInterval(() => {
            setProgress(prev => Math.max(0, prev - (100 / 100)));
        }, 100);

        timerRef.current = setTimeout(() => {
            clearInterval(progressRef.current);
            markComplete();
            navigate('/project?welcome=true');
        }, 10000);

        return () => {
            clearTimeout(timerRef.current);
            clearInterval(progressRef.current);
        };
    }, [isInitialized, navigate]);

    const markComplete = async () => {
        try {
            await axios.post('/api/complete-onboarding');
            if (onComplete) onComplete();
        } catch (err) {
            console.error('Failed to mark onboarding complete:', err);
        }
    };

    const handleClick = () => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        setCurrentToast(null);
        markComplete();
        navigate('/project?welcome=true');
    };

    if (!currentToast) return null;

    return (
        <div className="onboarding-toast-container">
            <div 
                className={`onboarding-toast onboarding-toast-success onboarding-toast-clickable ${currentToast.exiting ? 'onboarding-toast-exit' : ''}`}
                onClick={handleClick}
                role="button"
                tabIndex={0}
            >
                <div className="onboarding-toast-header">
                    <span className="onboarding-toast-icon">{currentToast.icon}</span>
                    <h4 className="onboarding-toast-title">{currentToast.title}</h4>
                </div>
                <div className="onboarding-toast-body">
                    <p>{currentToast.message}</p>
                </div>
                <div className="onboarding-toast-click-hint">
                    Click to explore projects →
                </div>
                <div className="onboarding-toast-progress">
                    <div 
                        className="onboarding-toast-progress-bar onboarding-toast-progress-success"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

// Projects Page Welcome Toast - Sequential: Ask Doubts first, then Clear Doubts
export const ProjectsWelcomeToast = ({ onComplete }) => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0); // 0 = ask doubts, 1 = clear doubts
    const [currentToast, setCurrentToast] = useState(null);
    const [progress, setProgress] = useState(100);
    const timerRef = useRef(null);
    const progressRef = useRef(null);

    const TOAST_DURATION = 12000; // 12 seconds

    const toastSteps = [
        {
            id: 'ask-doubts',
            title: 'Have Any Doubts?',
            message: 'Got questions about projects, tech, or anything else? Head to Q&A and ask the community!',
            icon: '•',
            actionText: 'Ask Doubts',
            actionPath: '/doubt?showClearToast=true'
        },
        {
            id: 'clear-doubts',
            title: 'Share Your Knowledge',
            message: 'Have expertise? Help fellow learners by answering their questions and clearing doubts!',
            icon: '•',
            actionText: 'Clear Doubts',
            actionPath: '/clear'
        }
    ];

    const dismissToast = useCallback(() => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        setCurrentToast(prev => prev ? { ...prev, exiting: true } : null);
        
        setTimeout(() => {
            if (currentStep < toastSteps.length - 1) {
                // Move to next toast
                setCurrentStep(prev => prev + 1);
                setProgress(100);
            } else {
                // All toasts done
                setCurrentToast(null);
                if (onComplete) onComplete();
            }
        }, 300);
    }, [currentStep, onComplete]);

    useEffect(() => {
        if (currentStep >= toastSteps.length) return;
        
        const step = toastSteps[currentStep];
        setCurrentToast({ ...step, exiting: false });
        setProgress(100);

        // 12 seconds duration
        progressRef.current = setInterval(() => {
            setProgress(prev => Math.max(0, prev - (100 / (TOAST_DURATION / 100))));
        }, 100);

        timerRef.current = setTimeout(() => {
            clearInterval(progressRef.current);
            dismissToast();
        }, TOAST_DURATION);

        return () => {
            clearTimeout(timerRef.current);
            clearInterval(progressRef.current);
        };
    }, [currentStep, dismissToast]);

    const handleAction = (actionPath) => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        setCurrentToast(null);
        if (onComplete) onComplete();
        navigate(actionPath);
    };

    if (!currentToast) return null;

    return (
        <div className="onboarding-toast-container">
            <div 
                className={`onboarding-toast onboarding-toast-info onboarding-toast-clickable ${currentToast.exiting ? 'onboarding-toast-exit' : ''}`}
                onClick={dismissToast}
                role="button"
                tabIndex={0}
            >
                <div className="onboarding-toast-header">
                    <span className="onboarding-toast-icon">{currentToast.icon}</span>
                    <h4 className="onboarding-toast-title">{currentToast.title}</h4>
                    <button 
                        className="onboarding-toast-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            dismissToast();
                        }}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
                <div className="onboarding-toast-body">
                    <p>{currentToast.message}</p>
                </div>
                <div className="onboarding-toast-actions">
                    <button 
                        className="onboarding-toast-action-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAction(currentToast.actionPath);
                        }}
                    >
                        {currentToast.actionText}
                    </button>
                    <button 
                        className="onboarding-toast-skip-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            dismissToast();
                        }}
                    >
                        Maybe Later
                    </button>
                </div>
                <div className="onboarding-toast-click-hint">
                    Click to skip →
                </div>
                <div className="onboarding-toast-progress">
                    <div 
                        className="onboarding-toast-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

// Clear Doubts Toast - shown on Ask Doubts page after coming from projects
export const ClearDoubtsToast = ({ onComplete }) => {
    const navigate = useNavigate();
    const [currentToast, setCurrentToast] = useState(null);
    const [progress, setProgress] = useState(100);
    const timerRef = useRef(null);
    const progressRef = useRef(null);

    const TOAST_DURATION = 10000; // 10 seconds

    const dismissToast = useCallback(() => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        setCurrentToast(prev => prev ? { ...prev, exiting: true } : null);
        setTimeout(() => {
            setCurrentToast(null);
            if (onComplete) onComplete();
        }, 300);
    }, [onComplete]);

    useEffect(() => {
        setCurrentToast({
            id: 'clear-doubts-prompt',
            title: 'Got Knowledge to Share?',
            message: 'If you have expertise, you can also help others by clearing their doubts!',
            icon: '•',
            type: 'info'
        });

        progressRef.current = setInterval(() => {
            setProgress(prev => Math.max(0, prev - (100 / (TOAST_DURATION / 100))));
        }, 100);

        timerRef.current = setTimeout(() => {
            clearInterval(progressRef.current);
            dismissToast();
        }, TOAST_DURATION);

        return () => {
            clearTimeout(timerRef.current);
            clearInterval(progressRef.current);
        };
    }, [dismissToast]);

    const handleClearDoubts = () => {
        clearTimeout(timerRef.current);
        clearInterval(progressRef.current);
        setCurrentToast(null);
        if (onComplete) onComplete();
        navigate('/clear');
    };

    if (!currentToast) return null;

    return (
        <div className="onboarding-toast-container">
            <div 
                className={`onboarding-toast onboarding-toast-info onboarding-toast-clickable ${currentToast.exiting ? 'onboarding-toast-exit' : ''}`}
                onClick={dismissToast}
                role="button"
                tabIndex={0}
            >
                <div className="onboarding-toast-header">
                    <span className="onboarding-toast-icon">{currentToast.icon}</span>
                    <h4 className="onboarding-toast-title">{currentToast.title}</h4>
                    <button 
                        className="onboarding-toast-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            dismissToast();
                        }}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
                <div className="onboarding-toast-body">
                    <p>{currentToast.message}</p>
                </div>
                <div className="onboarding-toast-actions">
                    <button 
                        className="onboarding-toast-action-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClearDoubts();
                        }}
                    >
                        Clear Doubts
                    </button>
                    <button 
                        className="onboarding-toast-skip-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            dismissToast();
                        }}
                    >
                        Maybe Later
                    </button>
                </div>
                <div className="onboarding-toast-click-hint">
                    Click to dismiss →
                </div>
                <div className="onboarding-toast-progress">
                    <div 
                        className="onboarding-toast-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default OnboardingToast;

