# My Teams (Microsoft Engage 2021)

## Installation 

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
_Note: While using on your local network, you may get a security warning from your browser regarding the validity of ssl certificate. It is because of the self-signed certificates being used during development. Please ignore and bypass using the `Advanced Options`_

