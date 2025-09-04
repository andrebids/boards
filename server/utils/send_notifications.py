# Copyright (c) 2024 PLANKA Software GmbH
# Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md

import sys
import json
import apprise
import logging
import os
from apprise import AppriseAsset, AppriseConfig

# Enable verbose logging for Apprise
logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def send_notification(url, title, body, body_format):
    # Set Apprise environment variables to force STARTTLS and override defaults
    if url.startswith('mailto://'):
        os.environ['APPRISE_SMTP_SECURE'] = 'starttls'
        os.environ['APPRISE_SMTP_MODE'] = 'starttls'
        os.environ['APPRISE_SMTP_TIMEOUT'] = '30'
        os.environ['APPRISE_VERIFY_CERTIFICATE'] = 'false'
    
    # Create an Apprise instance with debugging enabled
    asset = AppriseAsset()
    if url.startswith('mailto://'):
        # Force STARTTLS by setting the secure flag and clearing any defaults
        asset.secure = True
        # Clear any custom defaults that might interfere
        asset.smtp_secure = True
        asset.smtp_port = None  # Let Apprise detect from URL
        asset.smtp_host = None  # Let Apprise detect from URL
        # Force STARTTLS mode
        asset.smtp_mode = 'starttls'
        # Override timeout settings
        asset.request_timeout = 30
        # Disable any custom defaults
        asset.secure = True
        asset.verify_certificate = False
        
        # Modify URL to force security parameters
        if '?' in url:
            url += '&secure=starttls&mode=starttls'
        else:
            url += '?secure=starttls&mode=starttls'

    # Create Apprise instance with configuration file
    app = apprise.Apprise(asset=asset, debug=True)
    
    # Load configuration file to override defaults
    config = AppriseConfig()
    config.add('/app/.apprise')
    app.add(config)
    
    # Add the notification URL
    app.add(url)
    
    # Check the return value of the notify function
    if app.notify(title=title, body=body, body_format=body_format):
        print("Success: Apprise notification sent.")
    else:
        # Apprise already logs errors in debug mode, but we can add our own marker
        print("Failure: Apprise notification failed to send.", file=sys.stderr)


if __name__ == '__main__':
    try:
        services = json.loads(sys.argv[1])
        title = sys.argv[2]
        body_by_format = json.loads(sys.argv[3])

        for service in services:
            url = service['url']
            body_format = service['format']
            body = body_by_format[body_format]

            send_notification(url, title, body, body_format)
    except Exception as e:
        # Log any other exceptions that might occur
        logging.exception("An error occurred while processing notifications.")
        sys.exit(1)
