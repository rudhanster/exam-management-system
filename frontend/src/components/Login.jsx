import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';

function Login() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch((e) => {
      console.error('Login failed:', e);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">DutyDesk</h1>
          <p className="text-gray-600">Exam Management System</p>
        </div>
        
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
            <path d="M11.5 0L0 6.5V17l11.5 6 11.5-6V6.5L11.5 0z"/>
          </svg>
          Sign in with Microsoft 365
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-6">
          Use your college email (@college.edu) to sign in
        </p>
      </div>
    </div>
  );
}

export default Login;