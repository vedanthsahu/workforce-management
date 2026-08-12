"use client";

import { useEffect, useState } from 'react';
import Chatbot from './chatbot';

export default function Home() {
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    if (window.self === window.top) {
      const hostOrigin =
        process.env.NEXT_PUBLIC_HOST_APP_ORIGIN || 'http://localhost:3000';
      window.location.replace(hostOrigin);
      return;
    }
    setIsEmbedded(true);
  }, []);

  return isEmbedded ? <Chatbot /> : null;
}
