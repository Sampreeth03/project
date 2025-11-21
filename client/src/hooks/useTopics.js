// client/src/hooks/useTopics.js

import { useState, useEffect } from 'react';
import axios from 'axios';

const useTopics = () => {
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                // Fetch data from the Express API endpoint
                const response = await axios.get('/api/home/topics');
                setTopics(response.data);
            } catch (err) {
                console.error("Error fetching topics:", err);
                setError("Failed to load topics. Please check server connection.");
            } finally {
                setLoading(false);
            }
        };

        // We use a small timeout here to replicate the original EJS's 
        // staggered loading visual effect (setTimeout in EJS script)
        const timer = setTimeout(fetchTopics, 500); 

        return () => clearTimeout(timer);
    }, []);

    return { topics, loading, error };
};

export default useTopics;