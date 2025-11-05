import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import Login from './Login';

function ProtectedRoute({ children }) {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();

  if (!isAuthenticated) {
    return <Login />;
  }

  // Optional: Check if user email is from your college domain
  const userEmail = accounts[0]?.username;
  if (!userEmail?.endsWith('@college.edu')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p>Please use your college email (@college.edu)</p>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;