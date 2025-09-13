'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function TestPointsButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleTestPoints = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/test-award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          points: 100,
          description: 'Test points from dashboard'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Successfully awarded 100 points! New balance: ${result.newBalance}`);
        router.refresh(); // Refresh the page to show updated points
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error awarding test points:', error);
      alert(`❌ Error awarding points: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleTestPoints}
      disabled={loading}
      variant="secondary"
      className="w-full"
    >
      {loading ? 'Adding...' : 'Test +100 pts'}
    </Button>
  );
}