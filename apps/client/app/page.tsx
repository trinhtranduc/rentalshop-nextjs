'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@rentalshop/ui'
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Globe, 
  Shield, 
  Users, 
  BarChart3, 
  Smartphone, 
  Clock, 
  DollarSign,
  Star,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  BarChart,
  AlertTriangle,
  X
} from 'lucide-react'

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-card to-bg-tertiary">
      
        {/* Header */}
        <header className="bg-bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-text-inverted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-text-primary">AnyRent</span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-text-secondary hover:text-action-primary transition-colors">Features</a>
                <a href="#pricing" className="text-text-secondary hover:text-action-primary transition-colors">Pricing</a>
                <a href="#faq" className="text-text-secondary hover:text-action-primary transition-colors">FAQ</a>
                <a href="#contact" className="text-text-secondary hover:text-action-primary transition-colors">Contact</a>
                <Link href="/login" className="bg-brand-primary text-text-inverted px-4 py-2 rounded-lg hover:bg-brand-secondary transition-colors">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6">
                Modern Rental Shop
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-action-primary">
                  {" "}Management System
                </span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 max-w-3xl mx-auto">
                Professional rental shop management solution. Manage products, customers, and orders efficiently with our modern, easy-to-use platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="https://apps.apple.com/vn/app/rentalshop/id1500115668" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 bg-brand-primary text-text-inverted rounded-xl hover:bg-brand-secondary transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download App
                </a>
                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-brand-primary text-brand-primary rounded-xl hover:bg-brand-primary hover:text-text-inverted transition-all duration-200"
                >
                  <Globe className="w-5 h-5 mr-2" />
                  Try Web Portal
                </Link>
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-brand-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-action-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-action-warning/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>
        </section>

      {/* App Download Section */}
      <section id="download" className="py-20 bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Available on All Platforms
            </h2>
            <p className="text-xl text-text-secondary">
              Access your rental shop management from anywhere, anytime
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Mobile App</h3>
                  <p className="text-text-secondary">Manage your rental shop on the go with our iOS and Android apps</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-action-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Web Portal</h3>
                  <p className="text-text-secondary">Access full features through any web browser with responsive design</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-success/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BarChart className="w-6 h-6 text-action-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Analytics Dashboard</h3>
                  <p className="text-text-secondary">Get insights into your business performance with detailed reports</p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-3xl p-8 shadow-xl">
                <div className="w-64 h-96 bg-gradient-to-b from-brand-primary to-action-primary rounded-3xl mx-auto shadow-2xl flex items-center justify-center">
                  <div className="text-center text-text-inverted">
                    <Smartphone className="w-16 h-16 mx-auto mb-4" />
                    <div className="w-8 h-8 bg-bg-card rounded-lg flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="text-sm opacity-90">Mobile App</p>
                  </div>
                </div>
                <div className="mt-8">
                  <a 
                    href="https://apps.apple.com/vn/app/rentalshop/id1500115668" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-text-primary text-text-inverted py-3 px-6 rounded-xl hover:bg-text-secondary transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">📱</span>
                    Download on App Store
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-bg-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-text-primary mb-4">
                Powerful Features
              </h2>
              <p className="text-xl text-text-secondary">
                Everything you need to manage your rental business efficiently
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-brand-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">Order Management</h3>
                <p className="text-text-secondary">Create, track, and manage rental orders with ease. Monitor order status and history.</p>
              </div>
              
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-action-success/10 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-action-success" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">Customer Management</h3>
                <p className="text-text-secondary">Store customer information, track rental history, and manage customer relationships.</p>
              </div>
              
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-action-warning/10 rounded-xl flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-action-warning" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">Calendar & Scheduling</h3>
                <p className="text-text-secondary">Visual calendar to track rentals, returns, and availability of products.</p>
              </div>
            
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-action-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <DollarSign className="w-6 h-6 text-action-primary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">Financial Reports</h3>
                <p className="text-text-secondary">Generate detailed financial reports, track revenue, and analyze business performance.</p>
              </div>
            
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-action-danger/10 rounded-xl flex items-center justify-center mb-6">
                  <AlertTriangle className="w-6 h-6 text-action-danger" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">Duplicate Order Prevention</h3>
                <p className="text-text-secondary">Smart system prevents duplicate orders and ensures accurate inventory management.</p>
              </div>
            
              <div className="bg-bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-brand-secondary/10 rounded-xl flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6 text-brand-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-4">Multi-Platform Support</h3>
                <p className="text-text-secondary">Access your data from iOS, Android, and web platforms seamlessly.</p>
              </div>
            </div>
          </div>
        </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Why Choose AnyRent?
            </h2>
            <p className="text-xl text-text-secondary">
              Join hundreds of rental businesses that trust our platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Easy to Use</h3>
                  <p className="text-text-secondary">Intuitive interface designed for rental business owners, no technical skills required.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-success/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-action-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Time Saving</h3>
                  <p className="text-text-secondary">Automate routine tasks and focus on growing your business instead of paperwork.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-action-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">Increase Revenue</h3>
                  <p className="text-text-secondary">Better inventory management and customer tracking lead to increased sales.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-action-warning/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-action-warning" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">24/7 Support</h3>
                  <p className="text-text-secondary">Get help whenever you need it with our dedicated customer support team.</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-brand-primary to-action-primary rounded-3xl p-8 text-text-inverted">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-4">500+</div>
                  <div className="text-xl mb-8">Active Stores</div>
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-6 h-6 fill-current" />
                    ))}
                  </div>
                  <div className="text-sm mt-2">4.9/5 Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <Stats />

      {/* Testimonials Section */}
      <Testimonials />

        {/* CTA Section */}
      <CTA />

      {/* FAQ Section */}
      <FAQ />

      {/* Pricing Section */}
      <Pricing />

      {/* Footer */}
      <Footer />
      <FloatingButtons />
    </div>
  );
};

// Simple component implementations for the landing page
const Stats = () => {
  return (
    <section className="py-20 bg-brand-secondary text-text-inverted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">500+</div>
            <div className="text-text-inverted/70">Active Stores</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">10,000+</div>
            <div className="text-text-inverted/70">Orders Processed</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">4.9/5</div>
            <div className="text-text-inverted/70">Customer Rating</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">24/7</div>
            <div className="text-text-inverted/70">Support Available</div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  return (
    <section className="py-20 bg-bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-text-secondary">
            Join hundreds of satisfied rental business owners
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-bg-secondary rounded-2xl p-8">
            <div className="flex items-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-5 h-5 text-action-warning fill-current" />
              ))}
            </div>
            <p className="text-text-secondary mb-4">
              "AnyRent has helped me manage my rental business efficiently. The interface is easy to use and features are comprehensive."
            </p>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-text-inverted font-bold">
                J
              </div>
              <div className="ml-3">
                <div className="font-semibold text-text-primary">John Smith</div>
                <div className="text-sm text-text-tertiary">Rental Shop Owner</div>
              </div>
            </div>
          </div>
          
          <div className="bg-bg-secondary rounded-2xl p-8">
            <div className="flex items-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-5 h-5 text-action-warning fill-current" />
              ))}
            </div>
            <p className="text-text-secondary mb-4">
              "The order management feature is very convenient. I can track all orders easily and manage my inventory effectively."
            </p>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-action-success rounded-full flex items-center justify-center text-text-inverted font-bold">
                S
              </div>
              <div className="ml-3">
                <div className="font-semibold text-text-primary">Sarah Johnson</div>
                <div className="text-sm text-text-tertiary">Shop Manager</div>
              </div>
            </div>
          </div>
          
          <div className="bg-bg-secondary rounded-2xl p-8">
            <div className="flex items-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-5 h-5 text-action-warning fill-current" />
              ))}
            </div>
            <p className="text-text-secondary mb-4">
              "The mobile app is very convenient. I can manage my shop from anywhere and the interface is intuitive."
            </p>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-action-primary rounded-full flex items-center justify-center text-text-inverted font-bold">
                M
              </div>
              <div className="ml-3">
                <div className="font-semibold text-text-primary">Mike Wilson</div>
                <div className="text-sm text-text-tertiary">Business Owner</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  return (
    <section className="py-20 bg-brand-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold text-text-inverted mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-brand-primary/80 mb-8">
          Join thousands of rental businesses that trust our platform
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="https://apps.apple.com/vn/app/rentalshop/id1500115668" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-bg-card text-brand-primary rounded-xl hover:bg-bg-secondary transition-all duration-200 font-semibold"
          >
            <Download className="w-5 h-5 mr-2" />
            Download App
          </a>
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-bg-card text-bg-card rounded-xl hover:bg-bg-card hover:text-brand-primary transition-all duration-200"
          >
            <Globe className="w-5 h-5 mr-2" />
            Try Web Portal
          </Link>
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const [openItems, setOpenItems] = React.useState(new Set());
  
  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };
  
  const faqItems = [
    {
      question: "Is AnyRent free to use?",
      answer: "AnyRent offers a free trial version. You can sign up and use basic features without any cost."
    },
    {
      question: "Can I use it on multiple devices?",
      answer: "Yes, AnyRent supports multiple platforms. You can use it on iOS, Android, and web browsers."
    },
    {
      question: "Is my data secure?",
      answer: "We are committed to protecting your data. All information is encrypted and stored securely in the cloud."
    },
    {
      question: "Do you provide customer support?",
      answer: "Yes, we provide 24/7 customer support through chat, email, and phone."
    }
  ];
  
  return (
    <section id="faq" className="py-20 bg-bg-secondary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-text-secondary">
            Everything you need to know about AnyRent
          </p>
        </div>
        
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-bg-card rounded-lg shadow-sm">
              <Button
                onClick={() => toggleItem(index)}
                variant="ghost"
                className="w-full px-6 py-4 h-auto text-left flex items-center justify-between hover:bg-bg-secondary rounded-lg"
              >
                <span className="font-semibold text-text-primary">{item.question}</span>
                {openItems.has(index) ? (
                  <ChevronUp className="w-5 h-5 text-text-tertiary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-text-tertiary" />
                )}
              </Button>
              {openItems.has(index) && (
                <div className="px-6 pb-4">
                  <p className="text-text-secondary">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  const [selectedDuration, setSelectedDuration] = React.useState('3'); // '3', '6', '12'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Data for vertical cards with duration toggle
  const getPricingData = () => {
    const durationIndex = selectedDuration === '3' ? 0 : selectedDuration === '6' ? 1 : 2;
    
    return [
      {
        name: "Free Trial",
        subtitle: "Perfect for getting started",
        price: "$0",
        period: "7 days",
        description: "Try all features for free",
        features: [
          { text: "Order Management", included: true },
          { text: "Product Management", included: true },
          { text: "Customer Management", included: true },
          { text: "Revenue Reports", included: true },
          { text: "Single Account", included: true },
          { text: "Web Portal", included: true },
          { text: "Additional Accounts", included: false },
          { text: "Free Updates", included: true },
          { text: "Mobile App", included: true }
        ],
        popular: false,
        buttonText: "Start Free Trial",
        buttonClass: "bg-text-secondary hover:bg-text-primary"
      },
      {
        name: "Basic Plan",
        subtitle: "For small rental businesses",
        // Updated pricing: 3 months no discount, 6 months 5% discount, 12 months 15% discount
        price: selectedDuration === '3' ? "$5" : selectedDuration === '6' ? "$4.75" : "$4.25",
        period: "per month",
        description: "Perfect for small rental shops",
        features: [
          { text: "Order Management", included: true },
          { text: "Product Management", included: true },
          { text: "Customer Management", included: true },
          { text: "Revenue Reports", included: true },
          { text: "Two Accounts", included: true },
          { text: "Web Portal", included: false },
          { text: "Additional Accounts", included: true },
          { text: "Free Updates", included: true },
          { text: "Mobile App", included: true }
        ],
        popular: true,
        buttonText: "Get Started",
        buttonClass: "bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-secondary hover:to-brand-primary"
      },
      {
        name: "Premium Plan",
        subtitle: "For growing businesses",
        // Updated pricing: 3 months no discount, 6 months 5% discount, 12 months 15% discount
        price: selectedDuration === '3' ? "$10" : selectedDuration === '6' ? "$9.50" : "$8.50",
        period: "per month",
        description: "Advanced features for larger operations",
        features: [
          { text: "Order Management", included: true },
          { text: "Product Management", included: true },
          { text: "Customer Management", included: true },
          { text: "Revenue Reports", included: true },
          { text: "Five Accounts", included: true },
          { text: "Web Portal", included: true },
          { text: "Additional Accounts", included: true },
          { text: "Free Updates", included: true },
          { text: "Mobile App", included: true }
        ],
        popular: false,
        buttonText: "Get Started",
        buttonClass: "bg-gradient-to-r from-action-success to-action-primary hover:from-action-primary hover:to-action-success"
      }
    ];
  };

  const pricingData = getPricingData();

  return (
    <section id="pricing" className="py-20 bg-bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Simple Pricing
          </h2>
          <p className="text-xl text-text-secondary">
            Choose the plan that fits your business needs
          </p>
        </div>
        
        {/* Duration Toggle */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center bg-bg-secondary rounded-lg p-1">
            <Button
              onClick={() => setSelectedDuration('3')}
              variant={selectedDuration === '3' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '3' ? 'bg-bg-card shadow-sm' : ''}
            >
              <div className="text-center">
                <div>3 months</div>
                <div className="text-lg text-text-secondary font-bold">0%</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedDuration('6')}
              variant={selectedDuration === '6' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '6' ? 'bg-bg-card shadow-sm' : ''}
            >
              <div className="text-center">
                <div>6 months</div>
                <div className="text-lg text-action-success font-bold">-5%</div>
              </div>
            </Button>
            <Button
              onClick={() => setSelectedDuration('12')}
              variant={selectedDuration === '12' ? 'secondary' : 'ghost'}
              size="sm"
              className={selectedDuration === '12' ? 'bg-bg-card shadow-sm' : ''}
            >
              <div className="text-center">
                <div>12 months</div>
                <div className="text-lg text-action-danger font-bold">-15%</div>
              </div>
            </Button>
          </div>
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingData.map((plan, index) => (
            <div key={index} className={`relative bg-bg-card rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
              plan.popular ? 'border-brand-primary scale-105' : 'border-border'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-brand-primary text-text-inverted px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
                  <p className="text-text-secondary mb-4">{plan.subtitle}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                    <span className="text-text-secondary">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{plan.description}</p>
                </div>
                        
                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center justify-between">
                      <span className={`text-sm ${feature.included ? 'text-text-primary' : 'text-text-tertiary'}`}>
                        {feature.text}
                      </span>
                      {feature.included ? (
                        <Check className="w-6 h-6 text-action-success drop-shadow-sm" />
                      ) : (
                        <X className="w-6 h-6 text-action-danger drop-shadow-sm" />
                      )}
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Link 
                  href="/login" 
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-text-inverted transition-all duration-200 ${plan.buttonClass} inline-block text-center`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        {/* Additional information */}
        <div className="mt-16 text-center">
          <div className="bg-bg-secondary rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              All Plans Include
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">24/7 Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">Data Backup</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">Free Updates</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">Mobile App</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-action-success" />
                <span className="text-text-primary">Training</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer id="contact" className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-bold">AnyRent</span>
            </div>
            <p className="text-gray-400 mb-4">
              Leading rental management software in Vietnam
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#download" className="text-gray-400 hover:text-white transition-colors">Download App</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 AnyRent. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

const FloatingButtons = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col space-y-3">
        <a 
          href="https://apps.apple.com/vn/app/rentalshop/id1500115668" 
          target="_blank"
          rel="noopener noreferrer"
          className="bg-text-primary text-text-inverted p-3 rounded-full shadow-lg hover:bg-text-secondary transition-colors"
          title="Download iOS App"
        >
          <Download className="w-6 h-6" />
        </a>
        <Link 
          href="/login" 
          className="bg-brand-primary text-text-inverted p-3 rounded-full shadow-lg hover:bg-brand-secondary transition-colors"
          title="Login"
        >
          <Globe className="w-6 h-6" />
        </Link>
      </div>
    </div>
  );
};

export default LandingPage; 