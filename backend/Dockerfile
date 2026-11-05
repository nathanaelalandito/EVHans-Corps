FROM php:8.3-cli-alpine

RUN apk add --no-cache \
    curl \
    curl-dev \
    git \
    libxml2-dev \
    libzip-dev \
    mysql-client \
    oniguruma-dev \
    unzip \
    zip \
    && docker-php-ext-install \
    bcmath \
    curl \
    dom \
    mbstring \
    pcntl \
    pdo_mysql \
    simplexml \
    xml \
    xmlreader \
    xmlwriter \
    zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
    storage/logs bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

