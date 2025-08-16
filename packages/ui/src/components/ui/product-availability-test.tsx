'use client';

import React, { useState } from 'react';
import { useProductAvailability } from '../../hooks/useProductAvailability';
import { ProductAvailabilityBadge } from './product-availability-badge';

/**
 * Component test để kiểm tra logic trùng đơn
 */
export const ProductAvailabilityTest: React.FC = () => {
  const [testCase, setTestCase] = useState('case1');
  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [pickupDate, setPickupDate] = useState('2025-08-06');
  const [returnDate, setReturnDate] = useState('2025-08-09');
  
  const { calculateAvailability } = useProductAvailability();
  const [testResult, setTestResult] = useState<any>(null);

  // Mock product data
  const mockProduct = {
    id: '1',
    name: 'Product A',
    stock: 5 // Tổng kho: 5
  };

  // Mock orders data theo test case - 3 đơn hàng hiện có
  const getMockOrders = () => [
    {
      id: '1',
      orderType: 'RENT',
      status: 'PICKUP',
      pickupPlanAt: '2025-08-08',
      returnPlanAt: '2025-08-12',
      orderItems: [{ productId: '1', quantity: 1, name: 'Product A' }]
    },
    {
      id: '2',
      orderType: 'RENT',
      status: 'PICKUP',
      pickupPlanAt: '2025-08-11',
      returnPlanAt: '2025-08-16',
      orderItems: [{ productId: '1', quantity: 1, name: 'Product A' }]
    },
    {
      id: '3',
      orderType: 'RENT',
      status: 'PICKUP',
      pickupPlanAt: '2025-08-18',
      returnPlanAt: '2025-08-20',
      orderItems: [{ productId: '1', quantity: 1, name: 'Product A' }]
    }
  ];

  // Test cases
  const testCases = {
    case1: {
      name: 'Test Case 1: 06/08/2025 - 09/08/2025',
      pickupDate: '2025-08-06',
      returnDate: '2025-08-09',
      expectedAvailable: 4,
      description: 'Xung đột với đơn 1 (08/08-12/08) - 2 ngày trùng'
    },
    case2: {
      name: 'Test Case 2: 10/08/2025 - 17/08/2025',
      pickupDate: '2025-08-10',
      returnDate: '2025-08-17',
      expectedAvailable: 3,
      description: 'Xung đột với đơn 1 (08/08-12/08) và đơn 2 (11/08-16/08)'
    },
    case3: {
      name: 'Test Case 3: 21/08/2025 - 25/08/2025',
      pickupDate: '2025-08-21',
      returnDate: '2025-08-25',
      expectedAvailable: 5,
      description: 'Không xung đột với đơn hàng nào (21/08-25/08)'
    }
  };

  const runTest = async () => {
    const currentCase = testCases[testCase as keyof typeof testCases];
    setPickupDate(currentCase.pickupDate);
    setReturnDate(currentCase.returnDate);

    try {
      // Sử dụng trực tiếp calculateAvailability
      const result = calculateAvailability(
        mockProduct,
        getMockOrders(),
        currentCase.pickupDate,
        currentCase.returnDate,
        requestedQuantity,
        null // currentOrderId = null cho đơn hàng mới
      );

      setTestResult({
        ...result,
        testCase: currentCase,
        requestedQuantity,
        expectedAvailable: currentCase.expectedAvailable,
        isCorrect: result.available === currentCase.expectedAvailable
      });

      console.log('🧪 Test Result:', {
        testCase: currentCase.name,
        requestedQuantity,
        result,
        expectedAvailable: currentCase.expectedAvailable,
        isCorrect: result.available === currentCase.expectedAvailable
      });

    } catch (error) {
      console.error('Test error:', error);
      setTestResult({ error: (error as Error).message });
    }
  };

  // Chạy tất cả test cases cùng lúc
  const runAllTests = async () => {
    const allResults = [];
    
    for (const [key, testCase] of Object.entries(testCases)) {
      try {
        const result = calculateAvailability(
          mockProduct,
          getMockOrders(),
          testCase.pickupDate,
          testCase.returnDate,
          1, // Số lượng yêu cầu = 1 cho tất cả test
          null // currentOrderId = null cho đơn hàng mới
        );

        allResults.push({
          testCase: testCase,
          result: result,
          expectedAvailable: testCase.expectedAvailable,
          isCorrect: result.available === testCase.expectedAvailable
        });

        console.log(`🧪 Test ${key} Result:`, {
          testCase: testCase.name,
          result,
          expectedAvailable: testCase.expectedAvailable,
          isCorrect: result.available === testCase.expectedAvailable
        });

      } catch (error) {
        console.error(`Test ${key} error:`, error);
        allResults.push({
          testCase: testCase,
          error: (error as Error).message,
          isCorrect: false
        });
      }
    }

    setAllTestResults(allResults);
  };

  const [allTestResults, setAllTestResults] = useState<any[]>([]);

  const handleTestCaseChange = (newCase: string) => {
    setTestCase(newCase);
    const currentCase = testCases[newCase as keyof typeof testCases];
    setPickupDate(currentCase.pickupDate);
    setReturnDate(currentCase.returnDate);
    setRequestedQuantity(1);
    setTestResult(null);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4">🧪 Product Availability Test</h2>
      
      {/* Test Case Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Chọn Test Case:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(testCases).map(([key, testCaseData]) => (
            <button
              key={key}
              onClick={() => handleTestCaseChange(key)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                testCase === key 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{testCaseData.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {testCaseData.pickupDate} - {testCaseData.returnDate}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Expected: {testCaseData.expectedAvailable} available
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Test Case Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Test Case hiện tại:</h3>
        <div className="text-sm space-y-1">
          <div><strong>Ngày lấy:</strong> {pickupDate}</div>
          <div><strong>Ngày trả:</strong> {returnDate}</div>
          <div><strong>Mô tả:</strong> {testCases[testCase as keyof typeof testCases].description}</div>
          <div><strong>Expected Available:</strong> {testCases[testCase as keyof typeof testCases].expectedAvailable}</div>
        </div>
      </div>

      {/* Mock Orders Display */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-3">📋 Danh sách đơn hàng hiện có:</h3>
        <div className="space-y-2">
          {getMockOrders().map((order) => (
            <div key={order.id} className="p-3 bg-white rounded border border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">Đơn hàng #{order.id}</div>
                  <div className="text-sm text-gray-600">
                    Ngày lấy: {new Date(order.pickupPlanAt).toLocaleDateString('vi-VN')}
                  </div>
                  <div className="text-sm text-gray-600">
                    Ngày trả: {new Date(order.returnPlanAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">Số lượng: {order.orderItems[0].quantity}</div>
                  <div className="text-xs text-gray-500">Status: {order.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quantity Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Số lượng yêu cầu:
        </label>
        <input
          type="number"
          min="1"
          max="10"
          value={requestedQuantity}
          onChange={(e) => setRequestedQuantity(Number(e.target.value))}
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Run Test Button */}
      <button
        onClick={runTest}
        className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        🧪 Chạy Test
      </button>

      {/* Run All Tests Button */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={runAllTests}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          🚀 Chạy Tất Cả Test Cases
        </button>
        <button
          onClick={() => setAllTestResults([])}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          🗑️ Xóa Kết Quả
        </button>
      </div>

      {/* All Test Results Table */}
      {allTestResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">📊 Kết Quả Tất Cả Test Cases:</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Test Case</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Ngày Lấy - Ngày Trả</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Expected</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Actual</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Kết Quả</th>
                </tr>
              </thead>
              <tbody>
                {allTestResults.map((testResult, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="font-medium">{testResult.testCase.name}</div>
                      <div className="text-sm text-gray-600">{testResult.testCase.description}</div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {testResult.testCase.pickupDate} - {testResult.testCase.returnDate}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                      {testResult.expectedAvailable}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {testResult.error ? (
                        <span className="text-red-600">Error</span>
                      ) : (
                        testResult.result.available
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {testResult.error ? (
                        <span className="text-red-600">Error</span>
                      ) : (
                        <ProductAvailabilityBadge availability={testResult.result} />
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {testResult.error ? (
                        <span className="text-red-600 font-bold">❌ ERROR</span>
                      ) : testResult.isCorrect ? (
                        <span className="text-green-600 font-bold">✅ ĐÚNG</span>
                      ) : (
                        <span className="text-red-600 font-bold">❌ SAI</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">📈 Tóm Tắt:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Tổng số test:</strong> {allTestResults.length}
              </div>
              <div>
                <strong>Đúng:</strong> {allTestResults.filter(r => r.isCorrect).length}
              </div>
              <div>
                <strong>Sai:</strong> {allTestResults.filter(r => !r.isCorrect).length}
              </div>
            </div>
            <div className="mt-2">
              <strong>Tỷ lệ đúng:</strong> {((allTestResults.filter(r => r.isCorrect).length / allTestResults.length) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Kết quả Test:</h3>
          
          {/* Availability Badge */}
          <div className="flex items-center gap-4">
            <span className="font-medium">Status:</span>
            <ProductAvailabilityBadge availability={testResult} />
          </div>

          {/* Detailed Result */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Thông tin sản phẩm:</h4>
              <div className="text-sm space-y-1">
                <div><strong>Tổng kho:</strong> {testResult.storage}</div>
                <div><strong>Số lượng yêu cầu:</strong> {requestedQuantity}</div>
                <div><strong>Có sẵn:</strong> {testResult.available}</div>
                <div><strong>Đang thuê:</strong> {testResult.renting}</div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Kết quả kiểm tra:</h4>
              <div className="text-sm space-y-1">
                <div><strong>Status:</strong> {testResult.status}</div>
                <div><strong>Có xung đột ngày:</strong> {testResult.hasDateConflict ? 'Có' : 'Không'}</div>
                <div><strong>Số lượng xung đột:</strong> {testResult.conflictingQuantity}</div>
                <div><strong>Expected Available:</strong> {testResult.expectedAvailable}</div>
                <div className={`font-semibold ${testResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  <strong>Kết quả:</strong> {testResult.isCorrect ? '✅ ĐÚNG' : '❌ SAI'}
                </div>
              </div>
            </div>
          </div>

          {/* Expected vs Actual */}
          <div className={`p-4 rounded-lg ${
            testResult.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h4 className="font-semibold mb-2">So sánh Expected vs Actual:</h4>
            <div className="text-sm">
              <div><strong>Expected Available:</strong> {testResult.expectedAvailable}</div>
              <div><strong>Actual Available:</strong> {testResult.available}</div>
              <div className={`font-semibold ${testResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.isCorrect 
                  ? '✅ Kết quả đúng!' 
                  : '❌ Kết quả sai! Logic cần được sửa.'
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">📋 Hướng dẫn Test:</h3>
        <div className="text-sm space-y-2">
          <div><strong>Test Case 1 (06/08 - 09/08):</strong> Xung đột với đơn 1 → Số lượng 1-4 → Available, 5+ → Unavailable</div>
          <div><strong>Test Case 2 (10/08 - 17/08):</strong> Xung đột với đơn 1 và 2 → Số lượng 1-3 → Available, 4+ → Unavailable</div>
          <div><strong>Test Case 3 (21/08 - 25/08):</strong> Không xung đột → Số lượng 1-5 → Available, 6+ → Unavailable</div>
        </div>
      </div>
    </div>
  );
};
