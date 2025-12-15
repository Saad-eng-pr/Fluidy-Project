# Fluidy Screen Recorder - Chrome Extension
**Fluidy Screen Recorder** est une extension Chrome permettant d’enregistrer un onglet ou l’écran complet, avec la caméra et le micro de l’utilisateur.
Ce projet a été réalisé dans le cadre d’un projet d’entreprise (Fluidy).

## Fonctionnalités

- **Enregistrement d’un onglet Chrome.**
- **Enregistrement de l’écran.**
- **Capture du micro.**
- **Affichage de la caméra en overlay.**
- **Démarrage / arrêt de l’enregistrement.**
- **Lecture de la vidéo enregistrée.**

## Architecture de l’extension (Manifest V3)
L’extension repose sur trois composants principaux :

### Popup

- **Interface utilisateur permettant de** : lancer l’enregistrement, arrêter l’enregistrement et de choisir le type (onglet / écran)

### Service Worker (background)

- **Gère toute la logique de l’extension** : Démarre / arrête l’enregistrement, injecte la caméra dans la page, communique avec l’offscreen document et en fin ouvre la page de lecture vidéo.

### Offscreen Document

- **Page invisible utilisée pour** : accéder au DOM, utiliser MediaRecorder, enregistrer le flux audio / vidéo et renvoie la vidéo finale au service worker.



