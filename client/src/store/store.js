// Redux Store Configuration
import { configureStore } from '@reduxjs/toolkit';
import recruiterReducer from './recruiterSlice';

const store = configureStore({
    reducer: {
        recruiter: recruiterReducer
    },
    // Enable Redux DevTools in development
    devTools: process.env.NODE_ENV !== 'production'
});

export default store;
