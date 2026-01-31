'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Play, RotateCcw, Database } from 'lucide-react';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
  data?: any;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: string;
}

export default function TestDriverFlowPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [testData, setTestData] = useState<any>(null);

  const runFullTestSuite = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);
    
    try {
      console.log('Starting test suite...');
      const response = await fetch('/api/test/driver-flow-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setSummary(data.summary);
        console.log('Test suite completed:', data.summary);
      } else {
        console.error('Test suite failed:', data.error);
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Error running test suite:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const setupTestData = async () => {
    try {
      const response = await fetch('/api/test/setup-driver-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' })
      });
      
      const data = await response.json();
      if (data.success) {
        setTestData(data.testData);
        console.log('Test data setup completed:', data.testData);
      } else {
        console.error('Test data setup failed:', data.error);
      }
    } catch (error) {
      console.error('Error setting up test data:', error);
    }
  };

  const cleanupTestData = async () => {
    try {
      const response = await fetch('/api/test/setup-driver-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' })
      });
      
      const data = await response.json();
      if (data.success) {
        setTestData(null);
        console.log('Test data cleanup completed');
      } else {
        console.error('Test data cleanup failed:', data.error);
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  };

  const getStatusIcon = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' 
      ? <CheckCircle className="h-5 w-5 text-green-600" />
      : <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusColor = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Driver Flow Test Suite</CardTitle>
            <p className="text-muted-foreground">
              Comprehensive testing for the driver order matching system with location-based filtering and rejection tracking.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                onClick={runFullTestSuite} 
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <RotateCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
              </Button>
              
              <Separator orientation="vertical" className="h-8" />
              
              <Button 
                variant="outline" 
                onClick={setupTestData}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Setup Test Data
              </Button>
              
              <Button 
                variant="outline" 
                onClick={cleanupTestData}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Cleanup Test Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Summary */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{summary.passRate}</div>
                  <div className="text-sm text-muted-foreground">Pass Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Data Info */}
        {testData && (
          <Card>
            <CardHeader>
              <CardTitle>Test Data Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Test Drivers</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {testData.drivers.map((driver: any, index: number) => (
                      <div key={index} className="bg-muted rounded p-3">
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-sm text-muted-foreground">{driver.location}</div>
                        <div className="text-xs text-muted-foreground">ID: {driver.userId}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Test Orders</h4>
                  <div className="space-y-2">
                    {testData.orders.map((order: any, index: number) => (
                      <div key={index} className="bg-muted rounded p-2 text-sm">
                        <span className="font-medium">{order.number}</span> - {order.location}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            {results.map((result, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <h3 className="font-medium">{result.test}</h3>
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {result.details}
                  </p>
                  
                  {result.data && (
                    <details className="mt-3">
                      <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                        View Test Data
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Test Scenarios Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Test Scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">1. Setup Test Data</h4>
                <p className="text-muted-foreground">
                  Creates 2 test drivers (SF Downtown, Oakland) and 5 test orders at various distances.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Nearby Orders Fetching</h4>
                <p className="text-muted-foreground">
                  Tests that each driver only sees orders within their specified radius using Haversine formula.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">3. Order Rejection Tracking</h4>
                <p className="text-muted-foreground">
                  Tests that when a driver rejects an order, it's recorded in the database and never shown to that driver again.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">4. Order Availability to Other Drivers</h4>
                <p className="text-muted-foreground">
                  Verifies that orders rejected by one driver remain available to other drivers within radius.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">5. Order Acceptance & Assignment</h4>
                <p className="text-muted-foreground">
                  Tests order acceptance, database assignment updates, and removal from nearby order lists.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">6. Radius Filtering</h4>
                <p className="text-muted-foreground">
                  Validates that different radius values return appropriate order counts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}