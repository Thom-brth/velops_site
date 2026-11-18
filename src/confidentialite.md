---
layout: legal.njk
title: "Politique de confidentialité"
description: "Politique de confidentialité de Brignais Cycle : aucun cookie, aucune collecte en ligne, données de rendez-vous utilisées uniquement pour la prestation et la facture."
---
{#- ⚠️ TEXTE JURIDIQUE À RELIRE PAR L'EXPLOITANT AVANT MISE EN LIGNE.
    Référence : règlement (UE) 2016/679 (RGPD), art. 6, 13 et 15 à 21 ; loi n° 78-17 du 6 janvier 1978. -#}

## En bref

- Le site ne dépose **aucun cookie** et n'utilise **aucun traceur** : pas de bannière à valider.
- Il n'y a aucun formulaire : le site ne collecte rien lui-même.
- Les informations transmises par téléphone, SMS ou e-mail servent uniquement à organiser le rendez-vous et à établir la facture.

## Responsable du traitement

{{ site.exploitant }} EI – {{ site.nom }}. Coordonnées complètes dans les [mentions légales](/mentions-legales/). Contact : {{ site.email }}.

## Données traitées et finalités

**Prise de rendez-vous et prestation**

- Données : nom, téléphone, e-mail, description du vélo et de la panne, échanges.
- Finalité : organiser le rendez-vous et réaliser la prestation.
- Base légale : mesures précontractuelles et exécution du contrat (RGPD, art. 6.1.b).
- Conservation : [À COMPLÉTER : durée, ex. 3 ans après le dernier contact].

**Facturation**

- Données : nom, prestations, montants.
- Finalité : comptabilité.
- Base légale : obligation légale (RGPD, art. 6.1.c).
- Conservation : 10 ans (art. L.123-22 du Code de commerce).

Ces données ne sont ni vendues, ni cédées, ni utilisées à des fins publicitaires. Elles ne sont accessibles qu'à l'exploitant et, pour la messagerie, à son fournisseur : [À COMPLÉTER : fournisseur de messagerie e-mail].

## Visite du site

L'hébergeur ({{ site.hebergeur.nom }}) enregistre, comme tout serveur web, des journaux techniques (adresse IP, page demandée, date) pour assurer la sécurité et le fonctionnement du service. L'exploitant n'y a pas accès. Voir la [politique de confidentialité de l'hébergeur]({{ site.hebergeur.confidentialite }}).

La carte de la page Contact n'est chargée depuis OpenStreetMap que si tu cliques sur « Afficher la carte » ; ton adresse IP est alors transmise à la fondation OpenStreetMap.
{%- if site.SHOW_BIKES %}

Sur la page « Vélos à vendre », les photos des vélos sont chargées directement depuis le site de BikeStocks (bikestocks.es), qui reçoit à cette occasion ton adresse IP. Les liens « Voir sur BikeStocks » contiennent un paramètre indiquant que tu viens de ce site ; une fois sur bikestocks.es, c'est la politique de confidentialité de BikeStocks qui s'applique.
{%- endif %}
{%- if site.goatcounter %}

Mesure d'audience : le site utilise GoatCounter, un outil de statistiques sans cookie qui ne permet pas de t'identifier (pages vues agrégées), exempté de consentement selon les recommandations de la CNIL.
{%- endif %}

## Tes droits

Tu peux demander à accéder à tes données, les faire rectifier ou effacer, en limiter le traitement, t'y opposer ou en obtenir la portabilité, en écrivant à {{ site.email }}. Réponse sous un mois au plus.

Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL : [www.cnil.fr](https://www.cnil.fr/fr/plaintes), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
