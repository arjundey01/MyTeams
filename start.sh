source env/bin/activate
supervisorctl stop all
unlink /tmp/supervisor.sock
python manage.py collectstatic --no-input --clear
python manage.py migrate
python manage.py shell < startup.py
supervisord -c supervisord.conf
