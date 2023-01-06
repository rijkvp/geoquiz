import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import { Map as OLMap } from 'ol';
import Point from 'ol/geom/Point';
import View from 'ol/View';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';

class City {
    name: string;
    latitude: number;
    longitude: number;
}

class State {
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    cities: City[];
}

class CountryInfo {
    iso3: string;
    emoji: string;
    name: string;
    latitude: number;
    longitude: number;
}

class Country {
    emoji: string;
    name: string;
    capital: string;
    native: string;
    latitude: number;
    longitude: number;
    states: State[];
}

enum GameState {
    Home,
    Practise,
}

class Game {
    #state?: string;

    #map: OlMap;
    #labelLayer: VectorLayer;
    #polygonLayer: VectorLayer;
    #popupOverlay: Overlay;
    #selected?: string;

    #popupContainer: HTMLElement;
    #popupText: HTMLElement;

    #countries: Map<string, CountryInfo>;
    #country?: Country;

    constructor() {
        const searchParams = new URLSearchParams(window.location.search);
        this.#state = searchParams.get('c');

        this.#labelLayer = new VectorLayer();
        this.#polygonLayer = new VectorLayer();

        document.getElementById('start-button')!
            .addEventListener('click', () => this.switchState(this.#selected));
        this.#popupContainer = document.getElementById('popup')!;
        this.#popupText = document.getElementById('popup-text')!;
        this.#popupOverlay = new Overlay({
            element: this.#popupContainer,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
        });
 
        this.#map = new OLMap({
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
                this.#polygonLayer,
                this.#labelLayer,
            ],
            overlays: [this.#popupOverlay],
            target: 'map',
            view: new View({
                center: [0, 0],
                zoom: 2,
            }),
        });
        this.#map.on('singleclick', (function (event) { this.mapClick(event); }).bind(this));

        this.startState();
    }

    async load() {
        this.#countries = await fetch('data/countries.json')
            .then((res) =>
                res.json()
            );
        this.#labelLayer.setSource(
            new VectorSource({
                features: new Collection(
                    Object.entries(this.#countries).map(([iso3, info]) => {
                        const feature = new Feature({
                            geometry: new Point(
                                fromLonLat([info.long, info.lat])
                            ),
                        });
                        feature.set('iso3', iso3);
                        feature.set('label', {
                            short: info.emoji,
                            long: `${info.emoji} ${info.name}`,
                        });
                        feature.setStyle(labelStyle);
                        return feature;
                    })
                ),
                format: new GeoJSON(),
            })
        );
    }

    async loadMapPolygons() {
        let countriesOverlay = await fetch('data/countries.geojson')
            .then((res) =>
                res.json()
            );
        const source = new VectorSource({
            features: new GeoJSON().readFeatures(countriesOverlay, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
            }),
        });
        this.#polygonLayer.setSource(source);
        this.#polygonLayer.setStyle(
            new Style({
                stroke: new Stroke({
                    color: 'red',
                    width: 2,
                }),
                fill: new Fill({
                    color: 'rgba(255, 0, 0, 0.1)',
                }),
        }));
    }

    switchState(state?: string) {
        console.log('switch state to', state);
        this.endState();
        this.#state = state;
        history.pushState(state, '', state != null ? `?c=${state}` : '')
        this.startState();
    }

    endState() {
        console.log('end state', this.#state);
        if (!this.#state) {
            this.#polygonLayer.clear();
        } else {

        }
    }

    startState() {
        console.log('start state', this.#state);
        if (!this.#state) {
            this.load();
            this.loadMapPolygons();
        } else {

        }
    }

    mapClick(event) {
        let clickHit = false;
        this.#map.forEachFeatureAtPixel(event.pixel, (feature) => {
            const iso3 = feature.get('iso3');
            this.#selected = iso3;
            const info = this.#countries[iso3];
            this.#popupText.innerText = `${info.emoji} ${info.name}`;
            clickHit = true;
        });
        if (clickHit) {
            this.#popupOverlay.setPosition(event.coordinate);
            this.#popupOverlay.panIntoView();
        }
    }

}

function labelStyle(feature, resolution) {
    const label = feature.get('label');
    let text = '??';
    let font = 'bold 15px sans-serif';
    if (resolution < 4000) {
        font = 'bold 22px sans-serif';
    }
    if (resolution > 10000) {
        text = label.short;
    } else {
        text = label.long;
    }
    return new Style({
        text: new Text({
            font,
            text,
            fill: new Fill({
                color: [0, 0, 0, 1],
            }),
            stroke: new Stroke({ color: [255, 255, 255, 1], width: 3 }),
            placement: 'line',
        }),
    });
}

new Game();
