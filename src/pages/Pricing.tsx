import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { EnhancedPlanComparison } from '@/components/ui/enhanced-plan-comparison';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, Star, Users, Zap, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Pricing = () => {
  const { user, signOut } = useAuth();

  const handleSignInClick = () => {
    const currentPath = window.location.pathname;
    window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const faqs = [
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. You'll continue to have access to your plan's features until the end of your billing period."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards including Visa, Mastercard, American Express, and Discover. Payments are processed securely through Stripe."
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 7-day money-back guarantee for new subscriptions. If you're not satisfied, contact our support team for a full refund."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "Your account remains active with free tier limitations. All your created slang terms and search history are preserved."
    },
    {
      question: "Can I upgrade or downgrade my plan?",
      answer: "Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the next billing cycle."
    }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "SlangLab Pro Plans",
    "description": "Evidence-based slang decoder and creator with professional features",
    "offers": [
      {
        "@type": "Offer",
        "name": "SearchPro",
        "price": "1.99",
        "priceCurrency": "USD",
        "priceValidUntil": "2025-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": "https://schema.org/InStock"
      },
      {
        "@type": "Offer", 
        "name": "LabPro",
        "price": "3.99",
        "priceCurrency": "USD",
        "priceValidUntil": "2025-12-31",
        "itemCondition": "https://schema.org/NewCondition", 
        "availability": "https://schema.org/InStock"
      }
    ]
  };

  return (
    <>
      <SEOHead 
        title="Pricing - SlangLab Pro Plans | Evidence-Based Slang Tools"
        description="Choose the perfect SlangLab plan for your needs. From free searches to unlimited AI creations and viral tracking. Start with our free tier or upgrade to SearchPro or LabPro."
        keywords="slang lab pricing, subscription plans, slang decoder pricing, AI slang creator cost, viral tracking tools"
        structuredData={structuredData}
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border px-4 py-4">
          <div className="container mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">SlangLab</h1>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">
                Decoder
              </Link>
              <Link to="/slang-lab" className="text-muted-foreground hover:text-foreground transition-colors">
                Creator
              </Link>
              <Link to="/pricing" className="text-foreground font-medium">
                Pricing
              </Link>
              <Link to="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Leaderboard
              </Link>
              {user && (
                <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
                  History
                </Link>
              )}
            </nav>
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button onClick={handleSignInClick} size="sm">
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">
              Choose Your <span className="text-primary">SlangLab</span> Plan
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              From casual slang detection to professional viral tracking, 
              we have the perfect plan for your needs.
            </p>
            <div className="flex items-center justify-center space-x-4 mb-8">
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>Evidence-Based</span>
              </Badge>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Zap className="h-3 w-3" />
                <span>AI-Powered</span>
              </Badge>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>Trusted by 10k+ Users</span>
              </Badge>
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="mb-16">
            <EnhancedPlanComparison 
              currentPlan={user ? "SearchPro" : "Free"} 
              showCheckout={true}
              source="pricing_page"
            />
          </div>

          {/* Value Propositions */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Perfect for Parents & Educators</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Stay connected with today's language. SearchPro gives you unlimited searches 
                  to decode any slang term with confidence scores and safety labels.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Unlimited daily searches</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Safety ratings & warnings</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Evidence-based definitions</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span>Ideal for Content Creators</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Create and track viral slang with LabPro. Get analytics, monitoring, 
                  and unlimited creation tools to stay ahead of trends.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Daily AI slang generation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Viral score tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Platform monitoring</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of users who trust SlangLab for evidence-based slang insights.
            </p>
            <div className="space-x-4">
              <Button asChild size="lg">
                <Link to="/lookup">Try Free Search</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/slang-lab">Create Slang</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Pricing;