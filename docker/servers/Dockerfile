FROM alpine:latest

#1 1. Install the OpenSSH server 
RUN apk add --no-cache openssh 

# 2. Generate the SSH host keys
RUN ssh-keygen -A 

#3. Configurto allow root login and password authenticati
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# 4. Set a password for the root use 
RUN echo 'root:test' | chpasswd

# 5. Expose the SSH port
EXPOSE 22

# 6. Run the SSH daemon in the foreground (-D) to keep the container alive 
CMD ["/usr/sbin/sshd", "-D"]
