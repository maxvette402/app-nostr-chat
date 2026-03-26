# strfry — high-performance Nostr relay written in C++
# https://github.com/hoytech/strfry
FROM hoytech/strfry:0.9.6

COPY strfry.conf /etc/strfry.conf

EXPOSE 7777

CMD ["strfry", "--config=/etc/strfry.conf", "relay"]
