# strfry — high-performance Nostr relay written in C++
# https://github.com/hoytech/strfry
FROM ghcr.io/dockur/strfry:latest

COPY strfry.conf /etc/strfry.conf

EXPOSE 7777

CMD ["/app/strfry", "--config=/etc/strfry.conf", "relay"]
