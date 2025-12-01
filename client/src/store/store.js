// Redux Store Configuration
import { configureStore } from '@reduxjs/toolkit';
import recruiterReducer from './recruiterSlice';
import adminReducer from './adminSlice';

const store = configureStore({
    reducer: {
        recruiter: recruiterReducer,
        admin: adminReducer
    },
    // Enable Redux DevTools in development
    devTools: process.env.NODE_ENV !== 'production'
});

export default store;
