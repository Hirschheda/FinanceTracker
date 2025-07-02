import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { Card, Button } from 'antd'; // Import Card and Button from antd

export default function Login() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await auth.signinRedirect();
    } catch (err) {
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      background: '#f5f6fa', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 24 
    }}>
      <Card
        title="Welcome Back"
        style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}
        headStyle={{ fontSize: 28, fontWeight: 700, color: '#1677ff', borderBottom: 'none' }}
        bodyStyle={{ padding: '24px 0' }}
      >
        <p style={{ color: '#666', marginBottom: 24 }}>Sign in to access your finance dashboard</p>
        <Button
          type="primary"
          size="large"
          onClick={handleSignIn}
          loading={loading}
          block
        >
          {loading ? "Redirecting..." : "Sign in with Cognito"}
        </Button>
      </Card>
    </div>
  );
} 