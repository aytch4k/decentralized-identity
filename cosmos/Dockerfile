FROM golang:1.20 as builder

# Install dependencies
WORKDIR /app
COPY ./app/ .
RUN go mod tidy
RUN go build -o cosmosd main.go

# Run Cosmos SDK binary
FROM ubuntu:20.04
COPY --from=builder /app/cosmosd /usr/bin/cosmosd
EXPOSE 26657 1317
ENTRYPOINT ["cosmosd"]
