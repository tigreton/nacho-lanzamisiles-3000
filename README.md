# Operación Nacho

Juego arcade sencillo, hecho con HTML, CSS y JavaScript sin dependencias. Usa la
lámina `assets/juego-nacho.webp` como atlas de sprites (con transparencia real:
el fondo se eliminó una sola vez, offline).

El boss del globo aerostático y sus cuatro miniglobos usan la lámina transparente
independiente `assets/boss-globo-sprites.webp`.

## Ejecutarlo

En macOS, haz doble clic en `JUGAR.command`.

También puedes iniciar un servidor local desde esta carpeta:

```bash
python3 -m http.server 8080
```

Después visita `http://localhost:8080`.

También puedes abrir `index.html` directamente con doble clic: los sprites ya
tienen transparencia real y no dependen de ningún procesado en el navegador.
El servidor local sigue siendo la opción recomendada.

## Controles

- `WASD` o flechas: mover
- `Espacio`: disparar
- `P` o `Escape`: pausa
- Ratón/táctil: arrastrar sobre el juego para mover y disparar

En el menú puedes elegir `Fácil`, `Normal` (predeterminado) o `Difícil` antes
de empezar. La selección cambia el blindaje del jugador, la velocidad y vida
de los enemigos, la frecuencia de aparición, el ritmo de disparo, la duración
de las oleadas y la vida del jefe.

En `Fácil`, además, los proyectiles enemigos tienen un hitbox reducido para
que sea más sencillo esquivarlos.

Al terminar cada oleada se abre la armería: puedes gastar monedas en una vida,
8 misiles explosivos, un escudo reflector o una ráfaga de doble disparo antes
de continuar. Los misiles hacen daño en área al impactar y el escudo devuelve
los proyectiles enemigos al tocar su barrera, hacia sus atacantes, durante 15 s.

En las oleadas de jefe se alternan el acorazado y un dirigible especial. El
dirigible lanza globos que debes derribar antes de que lleguen al helicóptero.
Cuando destruyes un globo, su cesta se desprende, corrige su trayectoria hacia
el helicóptero y debes esquivarla durante la caída. La cesta aguanta 5 segundos
antes de explotar.

Al destruir el dirigible, su góndola inferior se separa y persigue al
helicóptero durante 10 segundos antes de detonar. La góndola usa un sprite
separado extraído del atlas del dirigible (`assets/airship-gondola.webp`).

## Variantes de helicóptero

Se han guardado dos diseños nuevos para elegir como helicóptero del jugador:

- `assets/helicopter-player-v1.webp`: blindaje oliva, cabina azul y pods de misiles.
- `assets/helicopter-player-v2.webp`: versión sigilosa de grafito con cañón frontal.

Las habilidades son distintas: `BLINDADO` empieza con 2 vidas extra y reduce
un 25% el daño recibido; `SIGILO` se mueve un 22% más rápido, dispara un 28%
antes y tiene un hitbox un 13% menor.

Al empezar puedes elegir entre los dos helicópteros. En las oleadas pares no
boss aparece una base aérea volante; colócate encima de la plataforma con
“ATERRIZA” para abrir el cambio de helicóptero durante la partida.
