# Deploying Receptro with Docker and Kubernetes

This guide explains two ways to run the app in a container instead of
with `npm run dev`:

1. **Docker Compose** — the easy way, good for testing on your own
   computer or a single server.
2. **Kubernetes** — the more "real deployment" way, good for testing how
   the app behaves in a proper cluster.

You don't need to do both. If you're not sure which to try first, start
with Docker Compose — it's simpler and a good way to confirm the app and
Dockerfile actually work before moving on to Kubernetes.

---

## Part 1: Docker Compose

### What you need first

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  installed and running (this includes Docker Compose already, you don't
  need to install it separately).

### Steps

All commands below are run from inside the `receptro` project folder,
in a terminal.

**1. Build the images.**

```
docker compose build
```

This reads the `Dockerfile` and builds the app image. It'll take a
minute or two the first time.

**2. Start the database.**

```
docker compose up -d db
```

The `-d` means "run in the background". This starts just the Postgres
database first, by itself.

**3. Create the database tables (one-time step).**

```
docker compose run --rm migrate
```

This only needs to be run once, the very first time you set this up (or
again later if you change what's in `src/db/schema.ts`).

**4. Start the app.**

```
docker compose up -d
```

This starts everything (the app, and makes sure the database is still
running too).

**5. Open it in your browser.**

Go to **http://localhost:3000**

### Useful commands

```
# See what's running
docker compose ps

# Watch the app's logs (handy for the OTP codes, since SendGrid is
# blank by default and OTP codes get printed to the logs instead —
# see the main README for details)
docker compose logs -f app

# Stop everything
docker compose down

# Stop everything AND delete the saved database data (a clean slate)
docker compose down -v
```

### Before you go live with this

The `compose.yaml` file has some placeholder values written directly in
it (a database password, and `JWT_SECRET`). Those are fine for testing
on your own computer, but change them to something real and private
before running this anywhere other people can reach it.

---

## Part 2: Kubernetes

This is more involved than Docker Compose. It assumes you already have a
Kubernetes cluster to deploy into — either a small local one for
practice (like [Minikube](https://minikube.sigs.k8s.io/) or
[Kind](https://kind.sigs.k8s.io/)), or a real one from a cloud provider.

### What you need first

- A Kubernetes cluster, and `kubectl` set up to talk to it (running
  `kubectl get nodes` should show you something, not an error)
- A place to push a Docker image so your cluster can pull it — Docker
  Hub is the easiest for testing (free account at hub.docker.com)

### Step 1: Build and push the app image

```
docker build -t your-dockerhub-username/receptro:latest .
docker push your-dockerhub-username/receptro:latest
```

Swap in your own Docker Hub username. If you're using Minikube or Kind
for local testing, there are shortcuts that skip pushing to Docker Hub
entirely — see the "Testing locally" note near the bottom of this file.

### Step 2: Build and push the migration image

The database setup step needs a slightly different image — one that
still has the full project and tools in it (the main app image is
trimmed down on purpose, to keep it small).

```
docker build --target builder -t your-dockerhub-username/receptro-migrator:latest .
docker push your-dockerhub-username/receptro-migrator:latest
```

### Step 3: Point the YAML files at your images

Open these two files and replace the placeholder image name with the
one you actually pushed in Steps 1 and 2:

- `k8s/08-app-deployment.yaml` — the `image:` line
- `k8s/10-app-migrate-job.yaml` — the `image:` line

### Step 4: Set your own secrets (recommended)

The files `k8s/02-postgres-secret.yaml` and `k8s/07-app-secret.yaml`
have placeholder passwords in them, written out in the file. That's
fine for a first test, but for anything beyond that, it's better to
create the secrets straight from the command line instead of writing
passwords into a file at all. For example:

```
kubectl create namespace receptro

kubectl create secret generic postgres-secret \
  --namespace receptro \
  --from-literal=POSTGRES_USER=receptro \
  --from-literal=POSTGRES_PASSWORD=some-long-random-password \
  --from-literal=POSTGRES_DB=receptro

kubectl create secret generic app-secret \
  --namespace receptro \
  --from-literal=DATABASE_URL="postgresql://receptro:some-long-random-password@postgres:5432/receptro" \
  --from-literal=JWT_SECRET=another-long-random-string
```

If you do this, skip applying `02-postgres-secret.yaml` and
`07-app-secret.yaml` in Step 5 below, since you've already created
those secrets by hand.

### Step 5: Create everything, in order

Each command below applies one file. Do them in this order, because
later ones depend on earlier ones existing first (for example, the app
needs the database to exist before it can start).

```
kubectl apply -f k8s/01-namespace.yaml
kubectl apply -f k8s/02-postgres-secret.yaml
kubectl apply -f k8s/03-postgres-pvc.yaml
kubectl apply -f k8s/04-postgres-deployment.yaml
kubectl apply -f k8s/05-postgres-service.yaml
```

**Wait for the database to be ready before continuing.** Check with:

```
kubectl get pods -n receptro
```

Wait until the `postgres-...` pod shows `1/1` under READY and `Running`
under STATUS. Then continue:

```
kubectl apply -f k8s/06-app-configmap.yaml
kubectl apply -f k8s/07-app-secret.yaml
kubectl apply -f k8s/10-app-migrate-job.yaml
```

**Check the migration job finished successfully:**

```
kubectl get jobs -n receptro
kubectl logs -n receptro job/receptro-migrate
```

You should see Drizzle print out that it created the tables, with no
errors. Once that's done:

```
kubectl apply -f k8s/08-app-deployment.yaml
kubectl apply -f k8s/09-app-service.yaml
```

### Step 6: Check it's running

```
kubectl get pods -n receptro
```

Wait for the `receptro-app-...` pods to show `Running`.

### Step 7: Open it in your browser

The `receptro-app` Service isn't exposed to the outside world by
default (that's what `k8s/11-app-ingress.yaml` is for — see below). For
a quick local check without setting up an Ingress, forward a port from
your own computer straight to the Service:

```
kubectl port-forward -n receptro svc/receptro-app 3000:80
```

Then open **http://localhost:3000**. Leave that command running in its
own terminal window while you're testing — closing it disconnects the
forwarded port.

### Step 8 (optional): Set up the Ingress for a real domain

If you have a real domain name and an Ingress Controller already set up
on your cluster (see the comments inside `k8s/11-app-ingress.yaml`),
edit the `host:` line in that file to your real domain, then:

```
kubectl apply -f k8s/11-app-ingress.yaml
```

### Useful commands

```
# See everything running in the receptro namespace
kubectl get all -n receptro

# Watch the app's logs
kubectl logs -n receptro -l app=receptro-app -f

# Delete EVERYTHING (namespace, app, database, all of it)
kubectl delete namespace receptro
```

### Testing locally with Minikube or Kind

If you're just practicing on your own computer rather than deploying
somewhere real, you can skip pushing images to Docker Hub:

- **Minikube:** run `eval $(minikube docker-env)` in your terminal
  first, then run the `docker build` command from Step 1 as normal —
  it'll build the image directly inside Minikube where it can already
  see it.
- **Kind:** build the image normally, then load it in with
  `kind load docker-image your-dockerhub-username/receptro:latest`.

Either way, also add `imagePullPolicy: IfNotPresent` under the
`image:` line in `k8s/08-app-deployment.yaml` and
`k8s/10-app-migrate-job.yaml`, so Kubernetes uses the image you just
built locally instead of trying to download it from the internet.
