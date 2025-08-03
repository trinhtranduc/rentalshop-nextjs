'use client'

import React from "react";
import { Button } from "@rentalshop/ui";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@rentalshop/ui";
import { 
  Store, 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  Plus,
  Search
} from "lucide-react";

const DashboardPage = () => {
  const stats = [
    {
      title: "Total Products",
      value: "156",
      change: "+12%",
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Active Rentals",
      value: "23",
      change: "+5%",
      icon: ShoppingCart,
      color: "text-green-600"
    },
    {
      title: "Total Customers",
      value: "1,234",
      change: "+8%",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Revenue",
      value: "$12,345",
      change: "+15%",
      icon: DollarSign,
      color: "text-orange-600"
    }
  ];

  const recentRentals = [
    { id: 1, customer: "John Doe", product: "Drill Set", amount: "$45", status: "Active" },
    { id: 2, customer: "Jane Smith", product: "Ladder", amount: "$25", status: "Completed" },
    { id: 3, customer: "Mike Johnson", product: "Power Tools", amount: "$80", status: "Active" },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
              </div>
              <h1 className="ml-3 text-xl font-semibold text-text-primary">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">{stat.title}</p>
                      <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                      <p className="text-sm text-green-600">{stat.change} from last month</p>
                    </div>
                    <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Rentals */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Rentals</CardTitle>
                <CardDescription>Latest rental transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentRentals.map((rental) => (
                    <div key={rental.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <p className="font-medium text-text-primary">{rental.customer}</p>
                        <p className="text-sm text-text-secondary">{rental.product}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-text-primary">{rental.amount}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          rental.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rental.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Package className="w-4 h-4 mr-2" />
                    Manage Products
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    View Customers
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Check Rentals
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage; 