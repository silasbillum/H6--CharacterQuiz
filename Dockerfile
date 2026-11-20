FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY api/api.csproj ./api/
RUN dotnet restore ./api/api.csproj

COPY api/. ./api/
RUN dotnet publish ./api/api.csproj \
    -c Release \
    -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build /app/publish .
EXPOSE 10000
ENTRYPOINT ["sh", "-c", "dotnet api.dll --urls http://0.0.0.0:${PORT:-10000}"]