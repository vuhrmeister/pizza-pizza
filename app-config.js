const config = {
  server: {
    port: 3000
  },
  hashingSecret: 'ESohTha9lu7eishuSous',
  authTokenValidityMinutes: 60 * 24,
  stripe: {
    apiKey: 'sk_test_4eC39HqLyjWDarjtT1zdp7dc'
  },
  notification: {
    defaultSender: 'hi@sandbox5653e3a3e0e24e7899bc3804dc44c8e1.mailgun.org',
    mailgun: {
      apiKey: '5e3e4b93c2f1e36588e5af42c30c1e32-49a2671e-807427aa',
      domainName: 'sandbox5653e3a3e0e24e7899bc3804dc44c8e1.mailgun.org'
    }
  }
}

module.exports = config
