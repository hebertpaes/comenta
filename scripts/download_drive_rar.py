import requests
import sys
import os

def download_file_from_google_drive(id, destination):
    URL = "https://docs.google.com/uc?export=download"
    session = requests.Session()

    response = session.get(URL, params={'id': id}, stream=True)
    token = get_confirm_token(response)

    if token:
        params = {'id': id, 'confirm': token}
        response = session.get(URL, params=params, stream=True)

    save_response_content(response, destination)

def get_confirm_token(response):
    for key, value in response.cookies.items():
        if key.startswith('download_warning'):
            return value
    return "t"

def save_response_content(response, destination):
    CHUNK_SIZE = 32768
    with open(destination, "wb") as f:
        for chunk in response.iter_content(CHUNK_SIZE):
            if chunk:
                f.write(chunk)

if __name__ == "__main__":
    file_id = "1l1hIF-UdQQWN1mjCmwC-DJHe6ov36r0K"
    dest = "scratch/downloads/codatendechat.rar"
    os.makedirs("scratch/downloads", exist_ok=True)
    print(f"Baixando arquivo do Google Drive ID {file_id} para {dest}...")
    download_file_from_google_drive(file_id, dest)
    print(f"✓ Download concluído. Tamanho: {os.path.getsize(dest)} bytes")
