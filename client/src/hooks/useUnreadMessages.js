// hooks/useUnreadMessages.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useUnreadMessages = (projectId = null, refreshInterval = 10000) => {
    const [unreadCounts, setUnreadCounts] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchUnreadCounts = async () => {
        try {
            const response = await axios.get('/api/messages/unread-counts');
            console.log('Unread counts response:', response.data);
            if (response.data.success) {
                setUnreadCounts(response.data.unreadCounts);
            }
        } catch (error) {
            console.error('Error fetching unread counts:', error);
            console.error('Error details:', error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnreadCounts();
        
        // Poll for updates
        const interval = setInterval(fetchUnreadCounts, refreshInterval);
        
        return () => clearInterval(interval);
    }, [refreshInterval]);

    const getUnreadCount = (projId) => {
        const count = unreadCounts[projId] || 0;
        console.log(`Getting unread count for project ${projId}:`, count);
        console.log('All unread counts:', unreadCounts);
        return count;
    };

    const getTotalUnread = () => {
        return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    };

    return {
        unreadCounts,
        getUnreadCount,
        getTotalUnread,
        loading,
        refresh: fetchUnreadCounts
    };
};
