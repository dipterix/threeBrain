#!/bin/bash

debug=0

DIRECTORY=`dirname "$0"`
DIRECTORY=`realpath "$DIRECTORY"`

echo "Current directory:  $DIRECTORY"

if [ -z "$DIRECTORY" ]; then
  DIRECTORY=$(pwd)
else
  cd "$DIRECTORY"
fi



uname_out="$(uname -s)"
case "${uname_out}" in
    Linux*)     machine=linux;;
    Darwin*)    machine=mac;;
    CYGWIN*)    machine=cygwin;;
    MINGW*)     machine=mingw;;
    MSYS_NT*)   machine=git;;
    *)          machine="UNKNOWN:${uname_out}"
esac
echo "Running on:         ${machine}"

# Get python3 (optional)
py_path=$(which python3)
py_version=""
if [[ ! -z "$py_path" ]]; then
  py_version=$($py_path -V 2>&1)
  echo "Python detected:    ${py_version}"
fi


# read in server_config.txt
{
  read -r host_ip0;
} < "$DIRECTORY/server_config.txt"

if [ -z "$host_ip0" ]
then
  echo "No host specified in server_config.txt, using 127.0.0.1 (localhost). "
  echo "Here are (potential) available IPs:"
  echo "$(ifconfig | grep inet\ )"
  host_ip0="127.0.0.1"
fi

get_host_ip() {
  echo $host_ip0
}

get_host_port () {

  {
    read -r;
    read -r host_port0;
  } < "$DIRECTORY/server_config.txt"

  if [ -z "$host_port0" ]
  then
    host_port0=4322
  fi

  # test $host_port0
  if [ ! -z "$py_path" ]
  then
    # get free port
    PYTHON_CODE=$(cat <<END
import socket
tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
prefer_host = "$(get_host_ip)"
prefer_port = $host_port0
if prefer_port > 0 and prefer_port < 65536:
  try:
    tcp.bind((prefer_host, prefer_port))
  except:
    tcp.bind((prefer_host, 0))
else:
  tcp.bind((prefer_host, 0))
host, port = tcp.getsockname()
tcp.close()
print(port)
END
)
    host_port0=$($py_path -c "$PYTHON_CODE")
  fi;

  echo $host_port0
}

host_ip=$(get_host_ip)
host_port=$(get_host_port)
host_url="http://${host_ip}:${host_port}"

host_url2=$host_url
if [[ "$host_ip" = "0.0.0.0" ]]; then
  host_url2="http://127.0.0.1:$host_port"
fi

echo "<html><head><meta http-equiv=\"refresh\" content=\"3;url=$host_url2\" /></head><body>Launching a simple web server at <a href="$host_url2">$host_url</a> ...</body></html>" > "redirect.html"
redir_url="file:///$DIRECTORY/redirect.html"


echo "-----------------------------------------------------------------------"
if [[ "$host_ip" = "127.0.0.1" ]] || [[ "$host_ip" = "localhost" ]]; then
  echo "A **local** static server has been launched. "
  echo "Please copy-paste the following address to your web browser:"
  echo ""
  echo "$host_url"
  echo ""
elif [[ "$host_ip" = "0.0.0.0" ]]; then
  echo "A global static server has been launched. "
  echo "Please copy-paste the following address to your web browser:"
  echo ""
  echo "http://127.0.0.1:$host_port"
  echo ""
  echo "If you want to share this live viewer with other people, please "
  echo "  consider replacing the localhost address 127.0.0.1 with "
  echo "  one of the following IP addresses:"
  (
    echo "   " $(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v "127.0.0.1")
  ) || {
    echo "   " $(ip -o addr show scope global | awk '{gsub(/\/.*/, " ",$4); print $4}')
  } || {
    echo "    (Unable to obtain the list of IP addresses)"
  }
else
  echo "A static server has been launched at $host_ip."
  echo "Please copy-paste the following address to your web browser. "
  echo "You can also share this live viewer with those who have access to this "
  echo "IP address:"
  echo ""
  echo "$host_url"
  echo ""
fi
echo "-----------------------------------------------------------------------"

if [[ -z "$py_path" ]] || [[ "$debug" = "1" ]]; then
  # Launch service using built-in server
  # Get server app name
  echo "Using built-in static server"
  server_app="server_${machine}"
  chmod 0755 ./$server_app
  if [[ "$machine" = "mac" ]]
  then
    open "$redir_url"
  fi
  ./$server_app -d "$DIRECTORY" -l "$host_url"
else
  # python is available
  echo "$py_path"
  $py_path -m webbrowser -t "$redir_url"
  if echo $py_version | grep -q '^Python 3\.'; then
    $py_path -m http.server -b "$host_ip" -d "$DIRECTORY" $host_port
  else
    $py_path -m SimpleHTTPServer $host_port
  fi

fi


