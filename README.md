# DOCFlow

Frontend para founders y CFOs que quieren mover tesorería ociosa en **DOC** hacia rendimiento en **Tropykus**, sobre **Rootstock Testnet**, sin backend y sin custodiar fondos.

## Qué es

DOCFlow es una SPA construida con **React + TypeScript + Vite** que permite:

- conectar wallet compatible con Rootstock Testnet
- leer balance real de `DOC`
- simular una política de tesorería con reserva operativa
- proyectar rendimiento estimado usando APY del mercado `kDOC`
- ejecutar el flujo de depósito hacia Tropykus (`approve` + `mint`)
- consultar la posición resultante en `kDOC`

La app corre 100% en el cliente. No hay API propia, no hay servidor, no hay base de datos.

## Propuesta de valor

Muchas startups dejan caja inmovilizada en stablecoins sin una política clara de asignación. DOCFlow ordena ese proceso:

- separa una **reserva operativa**
- muestra cuánto capital queda realmente deployable
- proyecta el rendimiento esperado
- conecta la decisión financiera con una acción on-chain concreta

En una demo o hackathon, eso importa porque NO estás mostrando “otra wallet app”: estás mostrando una herramienta de tesorería con narrativa de negocio.

## Stack

- **React 19**
- **TypeScript**
- **Vite**
- **React Router**
- **ethers**
- **XO Connect / Beexo**
- **Rootstock Testnet**
- **Tropykus kDOC market**

## Funcionalidades principales

### 1. Landing de producto

Explica el problema, el stack y el flujo completo para un perfil founder/CFO.

Ruta:

- `/`

### 2. Dashboard de simulación

Permite ingresar:

- monto en DOC
- horizonte temporal en meses
- porcentaje de reserva operativa
- APY estimado o APY live

La UI calcula:

- reserva operativa
- capital deployable
- yield mensual estimado
- yield acumulado
- proyección total

Además puede compartir la simulación vía query params.

Ruta:

- `/invertir?tab=simular`

### 3. Flujo de constitución

Ejecuta el flujo real de depósito en Tropykus:

1. `approve` del token `DOC`
2. `mint`/depósito al mercado `kDOC`

Ruta:

- `/invertir?tab=constituir`

### 4. Consulta de posición

Lee:

- balance `kDOC`
- equivalente subyacente en `DOC`
- exchange rate
- APY live on-chain

Ruta:

- `/invertir?tab=posicion`

## Arquitectura

DOCFlow sigue una idea simple: **el browser habla directo con la blockchain**.

### Sin backend

- no hay endpoints propios
- no hay secretos de servidor
- no hay persistencia en base de datos
- no hay lógica crítica fuera del cliente

### Qué hace el frontend

- conecta la wallet
- detecta cuenta y red
- intenta switch a Rootstock Testnet
- lee balances y estado de contratos mediante RPC pública
- arma y solicita firmas para transacciones on-chain

### Qué NO hace

- no custodia fondos
- no ejecuta transacciones en nombre del usuario
- no guarda datos financieros en un servidor propio

## Contratos y red

Configuración actual tomada del proyecto:

- **Red:** Rootstock Testnet
- **Chain ID:** `31` (`0x1f`)
- **RPC pública:** `https://public-node.testnet.rsk.co`
- **Explorer:** `https://explorer.testnet.rootstock.io`
- **DOC token:** `0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0`
- **Tropykus kDOC:** `0x71e6b108d823c2786f8ef63a3e0589576b4f3914`
- **Money on Chain DOC mint:** `0x2820f6d4D199B8D8838A4B26F9917754B86a0c1F`
- **Faucet:** `https://faucet.rootstock.io/`

## Política de tesorería por defecto

El proyecto hoy trabaja con esta política inicial:

- **35%** reserva operativa
- **65%** capital deployable
- **6.2% APY** como referencia sample cuando no hay APY live disponible

Esto no es una recomendación financiera. Es una política de demo razonable para mostrar criterio de treasury allocation.

## Requisitos para desarrollo local

- **Node.js 20+** recomendado
- **pnpm** recomendado (aunque podés usar npm si preferís)
- wallet compatible con Rootstock Testnet
- idealmente **Beexo** para el flujo principal del proyecto

## Instalación

```bash
pnpm install
```

## Desarrollo local

```bash
pnpm dev
```

La app queda disponible en el host local que exponga Vite.

## Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
```

## Deploy en Vercel

Sí, se puede deployar directo en **Vercel** porque es una app **frontend-only**.

### Por qué necesita una configuración mínima

Usás `BrowserRouter`, así que si entrás directo a rutas como `/invertir`, Vercel tiene que devolver `index.html` y dejar que React resuelva la ruta en el cliente.

Por eso el proyecto incluye `vercel.json` con un rewrite SPA.

### Configuración sugerida en Vercel

- **Framework Preset:** Vite
- **Build Command:** `pnpm build`
- **Output Directory:** `dist`
- **Install Command:** `pnpm install`

### Variables de entorno

Hoy el proyecto **no requiere variables de entorno obligatorias** para compilar y correr, porque la configuración de red/contratos está hardcodeada en `src/lib/rootstock.ts`.

### Deploy paso a paso

1. Importá el repositorio en Vercel.
2. Confirmá que detecte **Vite**.
3. Verificá:
   - Build Command: `pnpm build`
   - Output Directory: `dist`
4. Deployá.

### Importante sobre rutas

La ruta principal del dashboard es:

- `/invertir`

Sin rewrite SPA, refrescar esa URL rompería con `404`. Con `vercel.json`, eso queda resuelto.

## Estructura del proyecto

```text
docflow/
├── public/
├── src/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── package.json
├── vite.config.ts
└── vercel.json
```

## Archivos clave

- `src/main.tsx` — routing principal (`/` y `/invertir`)
- `src/pages/Landing.tsx` — landing y narrativa del producto
- `src/pages/Dashboard.tsx` — simulación, constitución y posición
- `src/lib/rootstock.ts` — red, contratos, formatos y constantes del dominio
- `src/hooks/use-beexo-wallet.ts` — conexión y estado de wallet
- `src/hooks/use-allocation.ts` — flujo `approve` + depósito
- `src/hooks/use-kdoc-position.ts` — lectura de posición y APY live
- `vercel.json` — rewrite necesario para SPA en Vercel

## Limitaciones actuales

- trabaja sobre **Rootstock Testnet**, no mainnet
- depende de disponibilidad de RPC pública y wallets compatibles
- la política de treasury está predefinida para demo
- el valor financiero proyectado es estimativo

## Roadmap lógico

Si querés llevarlo de demo a producto más serio, los siguientes pasos razonables serían:

- parametrizar contratos/red por entorno
- agregar soporte explícito para más wallets EVM
- extraer configuración a variables `VITE_*`
- agregar analítica de uso
- incorporar estados de error más finos para transacciones rechazadas/fallidas
- sumar tests de hooks y flujos críticos

## Estado

Proyecto listo para:

- correr localmente
- mostrar demo end-to-end
- deployarse como SPA en Vercel

Si querés, el próximo paso lógico es dejar también el repo con un **commit atómico**, o revisar si conviene mover las direcciones de contratos a `VITE_*` para hacerlo más mantenible.
