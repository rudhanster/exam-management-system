const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

const azureConfig = {
  identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: process.env.AZURE_REDIRECT_URI,
  allowHttpForRedirectUrl: true,
  validateIssuer: false,
  passReqToCallback: false,
  
  // ✅ Use only basic permissions (no admin consent needed)
  scope: ['openid', 'profile', 'email'],  // Removed 'User.Read'
  
  loggingLevel: 'info',
  state: false 
};
{/*const azureConfig = {
  // ✅ FIXED: Use 'common' for multitenant support
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}/v2.0/.well-known/openid-configuration`,
  
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: process.env.AZURE_REDIRECT_URI,
  allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
  
  // ✅ FIXED: Set to false for multitenant
  validateIssuer: false,  // Changed from true
  
  passReqToCallback: false,
  scope: ['profile', 'email', 'User.Read'],
  loggingLevel: 'info',
};*/}

passport.use(
  new OIDCStrategy(azureConfig, async (iss, sub, profile, accessToken, refreshToken, done) => {
    try {
      // Extract user info
      const user = {
        id: profile.oid,
        email: profile._json.preferred_username || profile._json.email,
        name: profile.displayName,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
      };
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;