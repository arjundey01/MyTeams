# MyTeams (Microsoft Engage 2021)

## User Manual
Please follow this link for the user manual of MyTeams: 
[GitBook:MyTeams](https://arjundey01.gitbook.io/myteams/)

## For the Judges
#### Important
Kindly go through the Support and Requirements section of the user manual ([here](https://arjundey01.gitbook.io/myteams/#support-and-requirements)) to avoid unnecessary disruptions.
#### Navigating through files
The project has two apps namely `main` and `chat`. `main` handles User and Team operations, while `chat` handles text and video chat. The following will guide you through the files:
- The relevant code for the signalling channel for WebRTC may be found in `chat/consumers.py`
- JavaScript code for peer connection using WebRTC may be found in `chat/static/scripts/peer.js` and  `chat/static/scripts/peer-conn.js`.
- In Django the HTTP requests are handeled by functions called views. The views and the corresponding urls may be found in `views.py` and `urls.py` respectively in both the app directories.
- The HTML files may be found in the `templates/` directory in both the app directories.
- JavaScript files used in the pages may be found in `static/scripts/` directory in both the app directories.
- The database models may be found in `models.py` in both the app directories.

## Server Installation 

#### Cloning the repository:
- Clone the repository using `git clone https://github.com/arjundey01/MyTeams.git`.

#### Creating a virtual environment:
- Create a python virtual environment inside the project directory using the command `python3 -m venv env`.
- To activate the environment, run `source env/bin/activate` in **Linux** and `\env\Scripts\activate.bat` in **Windows**.
- To exit the virtual environment, run `deactivate`.

#### Installing dependencies:
- Activate the virtual environment
- Run `pip install -r req.txt`

#### Installing Redis:
- Linux:
    `sudo apt update`
    `sudo apt install redis-server`
- Windows:
    Redis can be run on windows using docker.
    Follow the steps given [here](https://docs.docker.com/docker-for-windows/install/#install-docker-desktop-on-windows).
    Install Redis using the command `docker pull redis`.


#### Migrating:
- Run `python3 manage.py makemigrations`
- Run `python3 manage.py migrate --run-syncdb`. _Note: Use the argument `--run-syncdb` only for installation_.

#### Configuration:
- Create the file `MyTeams/.env` following the example `MyTeams/.env_example`.
- Create the file `outh_settings.yml` following the example `oauth_settings_example.yml`.


## Starting the server:
- Activate the virtual environment.
- Run `python manage.py runsslserver 0.0.0.0:8000 --certificate certs/development.crt --key certs/development.key`.
- Run `daphne -e ssl:8001:privateKey=certs/development.key:certKey=certs/development.crt MyTeams asgi:application`. (_Make sure the Redis Server is running before this step_)
- The site will be available at https://localhost:8000/.
\
_Note I: If you are using the certificate in the `cert` directory, you may get a security warning from your browser regarding the validity of ssl certificate. It is because of the self-signed certificates being used during development. Please ignore and bypass using the `Advanced Options`_
\
_Note II: You can also access the site by running Daphne server only (at port 8001 instead of 8000), but it does not support automatic reload. Also static files of the apps need to be collected in the root static directory, which can be done using `python3 manage.py collectstatic --no-input --clear`. Daphne has been used for deployment, with supervisord, behind Nginx reverse proxy._
