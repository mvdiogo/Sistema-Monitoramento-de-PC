#!/usr/bin/env python

"""
Gera os arquivos de certificado CURVE para cliente e servidor e os move
para os diretórios apropriados (private_keys ou public_keys).
"""

import os
import shutil
import zmq.auth

def generate_certificates(base_dir):
    '''Gera os arquivos de certificado CURVE para cliente e servidor'''
    keys_dir = os.path.join(base_dir, 'certificates')
    public_keys_dir = os.path.join(base_dir, 'public_keys')
    secret_keys_dir = os.path.join(base_dir, 'private_keys')

    # Cria os diretórios para os certificados, removendo conteúdo antigo se necessário
    for d in [keys_dir, public_keys_dir, secret_keys_dir]:
        if os.path.exists(d):
            shutil.rmtree(d)
        os.mkdir(d)
    
    print(f"Diretórios de chaves criados em '{base_dir}'")

    # Cria novas chaves no diretório de certificados
    server_public_file, server_secret_file = zmq.auth.create_certificates(
        keys_dir, "server"
    )
    client_public_file, client_secret_file = zmq.auth.create_certificates(
        keys_dir, "client"
    )
    print("Certificados de servidor e cliente gerados.")

    # Move as chaves públicas para o diretório apropriado
    for key_file in os.listdir(keys_dir):
        if key_file.endswith(".key"):
            shutil.move(
                os.path.join(keys_dir, key_file), os.path.join(public_keys_dir, '.')
            )

    # Move as chaves secretas para o diretório apropriado
    for key_file in os.listdir(keys_dir):
        if key_file.endswith(".key_secret"):
            shutil.move(
                os.path.join(keys_dir, key_file), os.path.join(secret_keys_dir, '.')
            )
            
    # Remove o diretório temporário
    shutil.rmtree(keys_dir)
    
    print("Chaves públicas movidas para 'public_keys'.")
    print("Chaves secretas movidas para 'private_keys'.")
    print("✅ Processo concluído com sucesso!")


if __name__ == '__main__':
    if zmq.zmq_version_info() < (4, 0):
        raise RuntimeError(
            f"Segurança não é suportada na versão libzmq < 4.0. Versão atual: {zmq.zmq_version()}"
        )
    generate_certificates(os.path.dirname(__file__) or '.')