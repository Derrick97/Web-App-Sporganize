module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  'apps': [
    {
      'name'  : 'Sporganise',
      'script': 'Server.js',
      'env': {
        'NODE_ENV': 'dev',
        'PGHOST': process.env.PGHOST_DEV,
        'PGPORT': process.env.PGPORT_DEV,
        'PGDATABASE': process.env.PGDATABASE_DEV,
        'PGUSER': process.env.PGUSER_DEV,
        'PGPASSWORD': process.env.PGPASSWORD_DEV

      },
      'env_production': {
        'NODE_ENV': 'production'
      }
    }
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  'deploy': {
    'dev': {
      'user': 'www',
      'host': 'cloud-vm-45-111.doc.ic.ac.uk',
      'ref' : 'origin/master',
      'repo': 'git@gitlab.doc.ic.ac.uk:g1727116/WebApps.git',
      'path': '/var/www/sporganise-dev',
      'ssh_options': 'StrictHostKeyChecking=no',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env dev',
    }
  }
}
