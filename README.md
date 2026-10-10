# Operación Nacho

Juego arcade sencillo, hecho con HTML, CSS y JavaScript sin dependencias. Usa la
lámina `assets/juego-nacho.webp` como atlas de sprites (con transparencia real:
el fondo se eliminó una sola vez, offline).

El boss del globo aerostático y sus cuatro miniglobos usan la lámina transparente
independiente `assets/boss-globo-sprites.webp`.

## Jugar online

<https://tigreton.github.io/nacho-lanzamisiles-3000/>

## Ejecutarlo en local

En macOS, haz doble clic en `JUGAR.command`. En Windows, doble clic en
`JUGAR.bat` (requiere Python instalado y en el PATH).

También puedes iniciar un servidor local desde esta carpeta:

```bash
python -m http.server 8080     # en Windows; en macOS/Linux usa python3
```

Después visita `http://localhost:8080`.

También puedes abrir `index.html` directamente con doble clic: los sprites ya
tienen transparencia real y no dependen de ningún procesado en el navegador.
El servidor local sigue siendo la opción recomendada.

## Controles

- `WASD` o flechas: mover
- `Espacio` o `J`: disparar; mantener pulsado carga un misil grande
  (daño y onda expansiva crecen con la carga) que se lanza al soltar
- `P` o `Escape`: pausa
- Ratón/táctil: arrastrar sobre el juego para mover y disparar
- Mando: stick izquierdo o cruceta mueven, `A` dispara y `Start` pausa. En
  los menús (dificultad, helicóptero, armería, base aérea, pausa y fin de
  partida) la cruceta o el stick mueven el cursor entre las opciones, `A`
  pulsa la señalada, `Start` activa la acción principal de la pantalla y `B`
  vuelve atrás en el manual y la pausa.

Si cambias de pestaña o la ventana pierde el foco en mitad de una oleada, el
juego se pausa solo. Cada dificultad guarda su propio récord, visible en el
menú y al terminar la partida.

En el menú puedes elegir `Fácil`, `Normal` (predeterminado) o `Difícil` antes
de empezar. La selección cambia el blindaje del jugador, la velocidad y vida
de los enemigos, la frecuencia de aparición, el ritmo de disparo, la duración
de las oleadas y la vida del jefe.

En `Fácil`, además, los proyectiles enemigos tienen un hitbox reducido para
que sea más sencillo esquivarlos.

Al terminar cada oleada se abre la armería: puedes gastar monedas en una vida,
8 misiles explosivos, un escudo reflector, una ráfaga de doble disparo, 8
misiles teledirigidos o un dron aliado antes de continuar. La ráfaga dura 10 s,
tanto comprada como recogida del enemigo. Los misiles explosivos hacen daño en
área al impactar y el escudo devuelve los proyectiles enemigos al tocar su
barrera, hacia sus atacantes, durante 15 s.

Los teledirigidos corrigen su rumbo hacia el enemigo más cercano e ignoran el
blindaje frontal. El dron aliado escolta al helicóptero durante toda la oleada
siguiente y dispara al enemigo más cercano por su cuenta.

Además de helis, drones y cazas, desde la oleada 4 aparecen kamikazes: avisan
con un pitido y un parpadeo antes de lanzarse en piqué recto hacia tu
posición (no corrigen el rumbo, así que se esquivan en el último momento; si
el piqué te roza sin tocarte, cuenta como esquiva de milagro). Desde la oleada
5 aparece el blindado: su placa frontal repele los disparos normales; apunta
a la cúpula roja del morro para hacer daño doble o pásate por encima o por
detrás para dañarlo con normalidad. Desde la oleada 3 llegan
escuadrones de cinco cazas en V: si derribas el grupo completo antes de que se
disperse, suelta monedas extra.

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

## Probar el juego

El guion de pruebas funcional (7 bloques: menú, partida, pausa/sonido,
armería, base aérea, jefe y game over) vive en
[docs/guion-pruebas.md](docs/guion-pruebas.md).

## Licencia

[MIT](LICENSE) — el código es libre de usar, modificar y redistribuir.
