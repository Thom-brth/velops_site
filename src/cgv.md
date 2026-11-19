---
layout: legal.njk
date: 2026-11-18
title: "Conditions générales de vente – atelier"
description: "Conditions générales de vente des prestations de l'atelier vélo Brignais Cycle : devis, prix, délais, paiement, garanties, médiation."
---
{#- ⚠️ TEXTE JURIDIQUE À RELIRE PAR L'EXPLOITANT AVANT MISE EN LIGNE (idéalement par un juriste ou la CMA).
    Références : Code de la consommation (art. L.111-1, L.112-1, L.217-3 et s., L.221-28, L.611-1 et s.),
    Code civil (art. 1641 et s.), CGI art. 293 B. -#}

## 1. Objet

Les présentes conditions s'appliquent aux prestations de réparation, d'entretien, de nettoyage et de montage de vélos, ainsi qu'à la vente de pièces et consommables, réalisées par {{ site.exploitant }} EI – {{ site.nom }} (ci-après « l'atelier ») pour ses clients (ci-après « le client »). Les coordonnées complètes de l'atelier figurent dans les [mentions légales](/mentions-legales/).

## 2. Rendez-vous

L'atelier fonctionne uniquement sur rendez-vous, pris par téléphone, SMS ou e-mail, sur les créneaux indiqués sur le site. La prise de rendez-vous est gratuite et n'engage pas le client ; en cas d'empêchement, il est invité à prévenir l'atelier au plus tôt.

Certaines prestations ne sont pas proposées (liste sur la page [Prestations & tarifs](/prestations-tarifs/)).

## 3. Devis

Un devis gratuit est établi sur demande avant toute intervention. Si, en cours d'intervention, un travail ou une pièce non prévu s'avère nécessaire, l'atelier en informe le client et ne le réalise qu'avec son accord.

## 4. Prix

Les prix sont ceux affichés sur le site et à l'atelier au jour de l'intervention. Ce sont des prix nets : **TVA non applicable, art. 293 B du CGI**.

- La main-d'œuvre hors grille est facturée {{ tarifs.main_oeuvre.prix_tranche | euros }} par tranche de {{ tarifs.main_oeuvre.minutes }} minutes ({{ tarifs.main_oeuvre.taux_horaire | euros }}/h).
- Les pièces et consommables sont facturés en plus, sur une ligne séparée, au prix affiché.
- Pièces fournies par le client : {{ site.pieces_client }}

## 5. Durée d'intervention et restitution

Sauf accord contraire, le vélo est déposé, réparé et restitué au cours du même créneau. Pour les interventions longues (révision complète), une récupération le lendemain est convenue avec le client.

L'atelier ne dispose pas de lieu de stockage : le client s'engage à récupérer son vélo à l'heure convenue.

Vélo non récupéré : {{ site.velo_non_recupere }}

## 6. Paiement

Le paiement intervient à la restitution du vélo, par {{ site.paiements | join(", ") | lower }}. Le paiement par carte bancaire n'est pas accepté. Une facture est remise au client.

## 7. Garanties

**Pièces vendues.** Les pièces et consommables vendus par l'atelier bénéficient de la garantie légale de conformité (art. L.217-3 et suivants du Code de la consommation), pendant deux ans à compter de leur délivrance, et de la garantie des vices cachés (art. 1641 à 1649 du Code civil).

[À COMPLÉTER : insérer l'encadré officiel d'information sur la garantie légale de conformité prévu par le décret n° 2022-946 du 29 juin 2022]

**Réparations.** {{ site.garantie_reparations }}

## 8. Responsabilité

L'atelier est assuré en responsabilité civile professionnelle auprès de {{ site.assureur }}. Il est responsable des dommages causés au vélo du fait de son intervention. Il ne peut être tenu responsable des défauts ou usures préexistants non liés à son intervention, ni des conséquences d'une utilisation non conforme du vélo après restitution.

## 9. Droit de rétractation

Le contrat de prestation est conclu à l'atelier, lors de la dépose du vélo : il n'ouvre pas de droit de rétractation. Si un devis est accepté à distance (e-mail, SMS) et que le client demande expressément que l'intervention ait lieu avant la fin du délai de rétractation de 14 jours, il reconnaît perdre ce droit une fois la prestation entièrement exécutée (art. L.221-28, 1° du Code de la consommation).

## 10. Réclamations et médiation

Toute réclamation est à adresser à l'atelier par e-mail ({{ site.email }}) ou par courrier à l'adresse indiquée dans les mentions légales.

En cas de litige non résolu, le client consommateur peut recourir gratuitement au médiateur de la consommation : {{ site.mediateur.nom }}, {{ site.mediateur.adresse }}, {{ site.mediateur.site }}. Le médiateur ne peut être saisi qu'après une réclamation écrite préalable auprès de l'atelier, et au plus tard un an après celle-ci.

## 11. Données personnelles

Voir la [politique de confidentialité](/confidentialite/).

## 12. Droit applicable

Les présentes conditions sont soumises au droit français.
